import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../i18n/id';
import { I18nProvider } from '../i18n/provider';
import SummaryPage from './SummaryPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const openRow = {
  date: '2026-10-07',
  masuk: '2026-10-07T01:00:00.000Z',
  pulang: null,
  open: true,
};

type FetchMock = ReturnType<typeof vi.fn>;

function summaryCalls(fetchMock: FetchMock) {
  return fetchMock.mock.calls.filter(([url]) =>
    String(url).includes('/api/attendance/summary'),
  );
}

/** The default range the screen promises: month start through today. */
function expectedDefaultRange() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const iso = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return {
    from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: iso(now),
  };
}

function renderPage() {
  return render(
    <I18nProvider>
      <SummaryPage />
    </I18nProvider>,
  );
}

/** jsdom rejects partial text in a date field, so edits set the whole value. */
function changeDate(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

describe('SummaryPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the default range without query parameters and prefills the filter', async () => {
    const range = expectedDefaultRange();
    fetchMock.mockResolvedValue(jsonResponse({ rows: [openRow] }));

    renderPage();

    expect(await screen.findByTestId('summary-table')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: id['summary.title'] }),
    ).toBeInTheDocument();

    const [url] = summaryCalls(fetchMock)[0] as [string];
    expect(url).toBe('/api/attendance/summary');
    expect(screen.getByTestId('summary-from')).toHaveValue(range.from);
    expect(screen.getByTestId('summary-to')).toHaveValue(range.to);
  });

  it('re-queries with the chosen From–To range when Cari is used', async () => {
    const user = userEvent.setup();
    const range = expectedDefaultRange();
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ rows: [openRow] })),
    );

    renderPage();
    await screen.findByTestId('summary-table');

    changeDate('summary-to', '2026-10-05');
    await user.click(screen.getByTestId('summary-search'));

    await waitFor(() => expect(summaryCalls(fetchMock)).toHaveLength(2));
    const [url] = summaryCalls(fetchMock)[1] as [string];
    expect(url).toBe(
      `/api/attendance/summary?from=${range.from}&to=2026-10-05`,
    );
  });

  it('reserves the layout with the loading state while the range is in flight', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByTestId('summary-filter')).toBeInTheDocument();
  });

  it('offers a retry when the summary request fails', async () => {
    const user = userEvent.setup();
    let calls = 0;
    fetchMock.mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      return Promise.resolve(jsonResponse({ rows: [openRow] }));
    });

    renderPage();

    expect(await screen.findByTestId('server-error-state')).toBeInTheDocument();

    await user.click(screen.getByTestId('retry-button'));

    expect(await screen.findByTestId('summary-table')).toBeInTheDocument();
    expect(summaryCalls(fetchMock)).toHaveLength(2);
  });

  it('surfaces a rejected range as the filter inline message and keeps the rows', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('?')) {
        return Promise.resolve(
          jsonResponse(
            { statusCode: 400, code: 'RANGE_INVALID', message: 'from after to' },
            400,
          ),
        );
      }
      return Promise.resolve(jsonResponse({ rows: [openRow] }));
    });

    renderPage();
    await screen.findByTestId('summary-table');

    changeDate('summary-to', '2026-10-05');
    await user.click(screen.getByTestId('summary-search'));

    const message = await screen.findByTestId('summary-range-error');
    expect(message).toHaveTextContent(id['summary.filter.rangeInvalid']);
    expect(screen.getByTestId('summary-table')).toBeInTheDocument();
    expect(summaryCalls(fetchMock)).toHaveLength(2);
  });

  it('explains an empty range instead of showing a bare list', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ rows: [] }));

    renderPage();

    const empty = await screen.findByTestId('empty-state');
    expect(empty).toHaveTextContent(id['summary.empty.title']);
    expect(empty).toHaveTextContent(id['summary.empty.description']);
    expect(screen.queryByTestId('summary-table')).not.toBeInTheDocument();
  });

  it('treats a body without rows as an empty result', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    renderPage();

    const empty = await screen.findByTestId('empty-state');
    expect(empty).toHaveTextContent(id['summary.empty.title']);
  });

  it('fills dates of the chosen range that have no session with a no-data row', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          rows: [
            {
              date: '2026-10-02',
              masuk: '2026-10-02T01:00:00.000Z',
              pulang: null,
              open: true,
            },
            {
              date: '2026-10-04',
              masuk: '2026-10-04T01:00:00.000Z',
              pulang: '2026-10-04T09:00:00.000Z',
            },
          ],
        }),
      ),
    );

    renderPage();
    await screen.findByTestId('summary-table');

    changeDate('summary-from', '2026-10-01');
    changeDate('summary-to', '2026-10-04');
    await user.click(screen.getByTestId('summary-search'));

    await waitFor(() =>
      expect(screen.getAllByTestId('summary-card')).toHaveLength(4),
    );
    const [url] = summaryCalls(fetchMock)[1] as [string];
    expect(url).toBe('/api/attendance/summary?from=2026-10-01&to=2026-10-04');

    const container = screen.getByTestId('summary-cards');
    const entry = (date: string) => {
      const match = container.querySelector(`[data-date="${date}"]`);
      if (match === null) {
        throw new Error(`no card for ${date}`);
      }
      return match as HTMLElement;
    };

    expect(entry('2026-10-01')).toHaveTextContent(id['summary.row.noData']);
    expect(entry('2026-10-02')).toHaveTextContent(id['summary.row.stillWorking']);
    expect(entry('2026-10-03')).toHaveTextContent(id['summary.row.noData']);
    expect(entry('2026-10-04')).not.toHaveTextContent(id['summary.row.noData']);
    expect(screen.getAllByText(id['summary.row.noData'])).toHaveLength(4);
  });
});
