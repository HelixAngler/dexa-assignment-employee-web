import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import DateRangeFilter, { type DateRange } from './DateRangeFilter';

interface HarnessProps {
  initial: DateRange;
  defaults?: DateRange;
  error?: string | null;
  onSubmit?: (range: DateRange) => void;
  onReset?: () => void;
}

/** Wires the controlled component to local state the way the page does. */
function Harness({
  initial,
  defaults = { from: '2026-10-01', to: '2026-10-07' },
  error,
  onSubmit = vi.fn(),
  onReset,
}: HarnessProps) {
  const [range, setRange] = useState(initial);
  return (
    <DateRangeFilter
      from={range.from}
      to={range.to}
      defaultFrom={defaults.from}
      defaultTo={defaults.to}
      onChange={setRange}
      onSubmit={onSubmit}
      onReset={onReset}
      error={error}
    />
  );
}

function renderFilter(props: HarnessProps) {
  const onSubmit = props.onSubmit ?? vi.fn();
  render(
    <I18nProvider>
      <Harness {...props} onSubmit={onSubmit} />
    </I18nProvider>,
  );
  return { onSubmit };
}

/** jsdom rejects partial text in a date field, so edits set the whole value. */
function changeDate(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

describe('DateRangeFilter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('prefills both inputs from the current range and hides reset while it is the default', () => {
    renderFilter({ initial: { from: '2026-10-01', to: '2026-10-07' } });

    expect(screen.getByTestId('summary-filter')).toBeInTheDocument();
    expect(screen.getByTestId('summary-from')).toHaveValue('2026-10-01');
    expect(screen.getByTestId('summary-to')).toHaveValue('2026-10-07');
    expect(
      screen.getByRole('button', { name: id['summary.filter.search'] }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('summary-reset')).not.toBeInTheDocument();
  });

  it('shows a reset affordance once the range differs from the default and restores it', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    renderFilter({
      initial: { from: '2026-10-01', to: '2026-10-07' },
      onReset,
    });

    changeDate('summary-to', '2026-10-05');

    const reset = screen.getByRole('button', { name: id['summary.filter.reset'] });
    await user.click(reset);

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('falls back to restoring the default range through onChange when no reset handler is given', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderFilter({ initial: { from: '2026-10-01', to: '2026-10-05' }, onSubmit });

    await user.click(screen.getByRole('button', { name: id['summary.filter.reset'] }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('summary-to')).toHaveValue('2026-10-07');
  });

  it('blocks a From date after the To date with an inline message and a disabled Cari', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderFilter({
      initial: { from: '2026-10-06', to: '2026-10-07' },
      onSubmit,
    });

    changeDate('summary-from', '2026-10-08');

    expect(screen.getByTestId('summary-range-error')).toHaveTextContent(
      id['summary.filter.rangeInvalid'],
    );
    expect(screen.getByTestId('summary-from')).toHaveAttribute('aria-invalid', 'true');

    const search = screen.getByRole('button', { name: id['summary.filter.search'] });
    expect(search).toBeDisabled();
    await user.click(search);
    expect(onSubmit).not.toHaveBeenCalled();

    changeDate('summary-from', '2026-10-01');

    expect(screen.queryByTestId('summary-range-error')).not.toBeInTheDocument();
    expect(search).toBeEnabled();
  });

  it('submits the chosen range when Cari is used', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderFilter({
      initial: { from: '2026-10-01', to: '2026-10-07' },
    });

    changeDate('summary-to', '2026-10-05');
    await user.click(screen.getByRole('button', { name: id['summary.filter.search'] }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-05' });
  });

  it('shows a caller-supplied rejection as the inline message without blocking Cari', () => {
    renderFilter({
      initial: { from: '2026-10-01', to: '2026-10-07' },
      error: 'Rentang tanggal ditolak.',
    });

    expect(screen.getByTestId('summary-range-error')).toHaveTextContent(
      'Rentang tanggal ditolak.',
    );
    expect(
      screen.getByRole('button', { name: id['summary.filter.search'] }),
    ).toBeEnabled();
  });

  it('stacks search and reset full width on a phone and pairs them wider up', () => {
    renderFilter({ initial: { from: '2026-10-01', to: '2026-10-05' } });

    const search = screen.getByTestId('summary-search');
    const reset = screen.getByTestId('summary-reset');
    const row = search.parentElement;

    expect(row?.className).toContain('flex-col');
    expect(row?.className).toContain('sm:flex-row');
    expect(search.className).toContain('min-h-[44px]');
    expect(search.className).toContain('w-full');
    expect(search.className).toContain('sm:flex-1');
    expect(reset.className).toContain('w-full');
    expect(reset.className).toContain('sm:flex-1');
  });

  it('renders the English copy when English is the stored language', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('lang', 'en');
    renderFilter({ initial: { from: '2026-10-06', to: '2026-10-07' } });

    expect(screen.getByLabelText('From date')).toHaveValue('2026-10-06');
    expect(screen.getByLabelText('To date')).toHaveValue('2026-10-07');
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();

    changeDate('summary-from', '2026-10-08');

    expect(screen.getByTestId('summary-range-error')).toHaveTextContent(
      'The From date must not be after the To date.',
    );
    await user.click(screen.getByRole('button', { name: 'Search' }));
  });
});
