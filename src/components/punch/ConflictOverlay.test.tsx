import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import ConflictOverlay from './ConflictOverlay';

function renderOverlay(onRefresh = vi.fn()) {
  return {
    onRefresh,
    ...render(
      <I18nProvider>
        <ConflictOverlay onRefresh={onRefresh} />
      </I18nProvider>,
    ),
  };
}

describe('ConflictOverlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the already-clocked-in copy with a refresh action', () => {
    renderOverlay();

    const overlay = screen.getByTestId('conflict-overlay');
    expect(overlay).toHaveAttribute('role', 'alert');
    expect(screen.getByText(id['punch.conflict.alreadyIn'])).toBeInTheDocument();
    expect(
      screen.getByText(id['punch.conflict.description']),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: id['punch.conflict.refresh'] }),
    ).toBeInTheDocument();
  });

  it('fires onRefresh when the refresh action is used', () => {
    const { onRefresh } = renderOverlay();

    fireEvent.click(screen.getByTestId('conflict-refresh'));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('accepts an overriding title and description', () => {
    render(
      <I18nProvider>
        <ConflictOverlay
          onRefresh={vi.fn()}
          title="Judul konflik"
          description="Deskripsi konflik"
        />
      </I18nProvider>,
    );

    expect(screen.getByText('Judul konflik')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi konflik')).toBeInTheDocument();
  });

  it('renders the English copy when English is the stored language', () => {
    window.localStorage.setItem('lang', 'en');
    renderOverlay();

    expect(
      screen.getByText('You have already clocked in.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
