import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../src/i18n/id';
import { I18nProvider } from '../../src/i18n/provider';
import AbsenPage from '../../src/pages/AbsenPage';

/**
 * A control is the screen's primary action when it carries the primary
 * button styling: the primary button class or the primary background the
 * restyled screens use.
 */
const PRIMARY_BUTTON_PATTERN = /primary|bg-blue-600/;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderAbsen() {
  return render(
    <I18nProvider>
      <AbsenPage />
    </I18nProvider>,
  );
}

/** Every button currently on the screen, primary ones first in the check. */
function primaryButtons(): HTMLElement[] {
  return screen
    .getAllByRole('button')
    .filter((button) => PRIMARY_BUTTON_PATTERN.test(button.className));
}

describe('AbsenPage primary action', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('BELUM MASUK: the punch button is the single primary element of the screen', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 'belum_masuk',
        lastPunch: { direction: 'pulang', at: '2026-10-06T09:00:00.000Z' },
      }),
    );

    renderAbsen();
    expect(await screen.findByText(id['absen.status.belumMasuk'])).toBeInTheDocument();

    const punch = screen.getByTestId('punch-button');
    expect(punch).toHaveTextContent(id['absen.punch.masuk']);
    expect(punch).toHaveAttribute('type', 'button');
    expect(punch).toBeEnabled();

    const primaries = primaryButtons();
    expect(primaries).toHaveLength(1);
    expect(primaries[0]).toBe(punch);
  });

  it('SEDANG BEKERJA: the punch button is the single primary element of the screen', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 'bekerja',
        clockInAt: '2026-10-07T01:00:00.000Z',
        lastPunch: { direction: 'masuk', at: '2026-10-07T01:00:00.000Z' },
      }),
    );

    renderAbsen();
    expect(await screen.findByText(id['absen.status.bekerja'])).toBeInTheDocument();

    const punch = screen.getByTestId('punch-button');
    expect(punch).toHaveTextContent(id['absen.punch.pulang']);
    expect(punch).toHaveAttribute('type', 'button');
    expect(punch).toBeEnabled();

    const primaries = primaryButtons();
    expect(primaries).toHaveLength(1);
    expect(primaries[0]).toBe(punch);
  });
});
