import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import AbsenPage from './AbsenPage';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clockText(key: 'absen.clockIn'): RegExp {
  return new RegExp(id[key].replace('{time}', '\\d{2}[.:]\\d{2}'));
}

function renderAbsen() {
  return render(
    <I18nProvider>
      <AbsenPage />
    </I18nProvider>,
  );
}

function postCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      String(url).endsWith('/punches') &&
      (init as RequestInit | undefined)?.method === 'POST',
  );
}

describe('AbsenPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the loading state while the first punch state is in flight', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    renderAbsen();

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('renders the not-yet-clocked-in state with its header and last punch', async () => {
    fetchMock.mockImplementation((url: string) => {
      expect(String(url).endsWith('/punches/state')).toBe(true);
      return Promise.resolve(
        jsonResponse({
          status: 'belum_masuk',
          lastPunch: { direction: 'pulang', at: '2026-10-06T09:00:00.000Z' },
        }),
      );
    });

    renderAbsen();

    expect(await screen.findByText(id['absen.status.belumMasuk'])).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['absen.punch.masuk'] }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('absen-today')).toHaveTextContent(
      id['absen.todayLabel'],
    );
    const lastPunch = screen.getByTestId('absen-last-punch');
    expect(lastPunch).toHaveTextContent(id['absen.lastPunchLabel']);
    expect(lastPunch).toHaveTextContent(id['absen.direction.pulang']);
    expect(lastPunch).toHaveTextContent(/\d{2}[.:]\d{2}/);
  });

  it('renders the working state with the clock-in time and the pulang action', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 'bekerja',
        clockInAt: '2026-10-07T01:00:00.000Z',
        lastPunch: { direction: 'masuk', at: '2026-10-07T01:00:00.000Z' },
      }),
    );

    renderAbsen();

    expect(await screen.findByText(id['absen.status.bekerja'])).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['absen.punch.pulang'] }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('absen-clock-in')).toHaveTextContent(
      clockText('absen.clockIn'),
    );
  });

  it('punches with a fresh idempotency key and refetches the state', async () => {
    const user = userEvent.setup();
    let stateCalls = 0;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            sessionId: 's-1',
            direction: 'masuk',
            at: '2026-10-07T01:00:00.000Z',
          }),
        );
      }
      stateCalls += 1;
      return Promise.resolve(
        jsonResponse(
          stateCalls === 1
            ? { status: 'belum_masuk' }
            : { status: 'bekerja', clockInAt: '2026-10-07T01:00:00.000Z' },
        ),
      );
    });

    renderAbsen();
    await screen.findByText(id['absen.status.belumMasuk']);

    await user.click(screen.getByRole('button', { name: id['absen.punch.masuk'] }));

    expect(await screen.findByText(id['absen.status.bekerja'])).toBeInTheDocument();
    const posts = postCalls(fetchMock);
    expect(posts).toHaveLength(1);
    const [, init] = posts[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('Idempotency-Key')).toMatch(UUID_RE);
    expect(init.body).toBe(JSON.stringify({ direction: 'masuk' }));
    expect(stateCalls).toBe(2);
  });

  it('reuses the same idempotency key when a failed punch is retried', async () => {
    const user = userEvent.setup();
    let stateCalls = 0;
    let postCount = 0;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postCount += 1;
        if (postCount === 1) {
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        return Promise.resolve(
          jsonResponse({
            sessionId: 's-1',
            direction: 'masuk',
            at: '2026-10-07T01:00:00.000Z',
          }),
        );
      }
      stateCalls += 1;
      return Promise.resolve(
        jsonResponse(
          stateCalls === 1
            ? { status: 'belum_masuk' }
            : { status: 'bekerja', clockInAt: '2026-10-07T01:00:00.000Z' },
        ),
      );
    });

    renderAbsen();
    await screen.findByText(id['absen.status.belumMasuk']);

    await user.click(screen.getByRole('button', { name: id['absen.punch.masuk'] }));

    expect(await screen.findByTestId('network-error-overlay')).toBeInTheDocument();

    await user.click(screen.getByTestId('network-retry'));

    expect(await screen.findByText(id['absen.status.bekerja'])).toBeInTheDocument();
    const posts = postCalls(fetchMock);
    expect(posts).toHaveLength(2);
    const firstKey = new Headers((posts[0][1] as RequestInit).headers).get(
      'Idempotency-Key',
    );
    const secondKey = new Headers((posts[1][1] as RequestInit).headers).get(
      'Idempotency-Key',
    );
    expect(firstKey).toMatch(UUID_RE);
    expect(secondKey).toBe(firstKey);
  });

  it('shows the conflict overlay on a refused punch and refreshes it away', async () => {
    const user = userEvent.setup();
    let stateCalls = 0;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(
            {
              statusCode: 409,
              code: 'SESSION_ALREADY_OPEN',
              message:
                'Anda sudah absen masuk dan sesi masih berbuka. Silakan absen pulang terlebih dahulu.',
            },
            409,
          ),
        );
      }
      stateCalls += 1;
      return Promise.resolve(
        jsonResponse(
          stateCalls === 1
            ? { status: 'belum_masuk' }
            : { status: 'bekerja', clockInAt: '2026-10-07T01:00:00.000Z' },
        ),
      );
    });

    renderAbsen();
    await screen.findByText(id['absen.status.belumMasuk']);

    await user.click(screen.getByRole('button', { name: id['absen.punch.masuk'] }));

    const overlay = await screen.findByTestId('conflict-overlay');
    expect(overlay).toHaveTextContent(id['punch.conflict.alreadyIn']);
    expect(overlay).toHaveTextContent(
      'Anda sudah absen masuk dan sesi masih berbuka.',
    );

    await user.click(screen.getByTestId('conflict-refresh'));

    await waitFor(() =>
      expect(screen.queryByTestId('conflict-overlay')).not.toBeInTheDocument(),
    );
    expect(await screen.findByText(id['absen.status.bekerja'])).toBeInTheDocument();
    expect(stateCalls).toBe(2);
  });

  it('offers a retry when the initial state load fails', async () => {
    const user = userEvent.setup();
    let stateCalls = 0;
    fetchMock.mockImplementation(() => {
      stateCalls += 1;
      if (stateCalls === 1) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return Promise.resolve(jsonResponse({ status: 'belum_masuk' }));
    });

    renderAbsen();

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByText(id['absen.status.belumMasuk'])).toBeInTheDocument();
  });
});
