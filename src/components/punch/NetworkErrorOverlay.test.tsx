import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import NetworkErrorOverlay from './NetworkErrorOverlay';

function renderOverlay(onRetry = vi.fn()) {
  return {
    onRetry,
    ...render(
      <I18nProvider>
        <NetworkErrorOverlay onRetry={onRetry} />
      </I18nProvider>,
    ),
  };
}

describe('NetworkErrorOverlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the connection-failure copy with a retry action', () => {
    renderOverlay();

    const overlay = screen.getByTestId('network-error-overlay');
    expect(overlay).toHaveAttribute('role', 'alert');
    expect(screen.getByText(id['punch.network.title'])).toBeInTheDocument();
    expect(
      screen.getByText(id['punch.network.description']),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['punch.network.retry'] }),
    ).toBeInTheDocument();
  });

  it('fires onRetry when the retry action is used', () => {
    const { onRetry } = renderOverlay();

    fireEvent.click(screen.getByTestId('network-retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('accepts overriding copy', () => {
    render(
      <I18nProvider>
        <NetworkErrorOverlay
          onRetry={vi.fn()}
          title="Judul koneksi"
          description="Deskripsi koneksi"
        />
      </I18nProvider>,
    );

    expect(screen.getByText('Judul koneksi')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi koneksi')).toBeInTheDocument();
  });

  it('renders the English copy when English is the stored language', () => {
    window.localStorage.setItem('lang', 'en');
    renderOverlay();

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(
      screen.getByText('No data was lost. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
