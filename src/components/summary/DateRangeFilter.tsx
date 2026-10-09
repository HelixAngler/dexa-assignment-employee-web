import { type FormEvent } from 'react';
import { AlertIcon } from '../icons';
import { useI18n } from '../../i18n/provider';

/** A From–To range expressed as `YYYY-MM-DD` day strings. */
export interface DateRange {
  from: string;
  to: string;
}

export interface DateRangeFilterProps {
  /** From value shown in the input. */
  from: string;
  /** To value shown in the input. */
  to: string;
  /** From value the reset affordance restores; hidden while the range equals it. */
  defaultFrom: string;
  /** To value the reset affordance restores. */
  defaultTo: string;
  /** Fires on every edit of either input; the component stays fully controlled. */
  onChange: (next: DateRange) => void;
  /** Fires with the chosen range when Cari is used; never while the range is invalid. */
  onSubmit: (range: DateRange) => void;
  /** Restores the default range; falls back to `onChange` with the defaults. */
  onReset?: () => void;
  /** Rejection relayed by the caller (for example the server's own range check). */
  error?: string | null;
}

/**
 * Day-string comparison for `YYYY-MM-DD`: lexicographic order matches
 * chronological order, and a half-filled range cannot be judged yet.
 */
export function isRangeInvalid(from: string, to: string): boolean {
  if (from === '' || to === '') {
    return false;
  }
  return from > to;
}

/** Field box: 44 px floor, token colours, primary focus ring. */
const fieldClass =
  'mt-1 min-h-[44px] w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base leading-6 text-[var(--color-text-strong)] focus:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-page)] disabled:text-[var(--color-text-muted)]';

/**
 * From–To picker above the summary list: one control column per bound plus
 * the actions on the same wrapped row. The inputs are prefilled from the
 * range currently being shown, Cari hands the range back to the caller, and
 * a From date after the To date is reported inline and blocks the query so
 * the server never has to reject it.
 */
export default function DateRangeFilter({
  from,
  to,
  defaultFrom,
  defaultTo,
  onChange,
  onSubmit,
  onReset,
  error,
}: DateRangeFilterProps) {
  const { t } = useI18n();
  const invalid = isRangeInvalid(from, to);
  const message = invalid ? t('summary.filter.rangeInvalid') : (error ?? null);
  const showReset = from !== defaultFrom || to !== defaultTo;

  function handleChange(field: keyof DateRange, value: string) {
    onChange(field === 'from' ? { from: value, to } : { from, to: value });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid) {
      return;
    }
    onSubmit({ from, to });
  }

  function handleReset() {
    if (onReset !== undefined) {
      onReset();
      return;
    }
    onChange({ from: defaultFrom, to: defaultTo });
  }

  return (
    <form
      data-testid="summary-filter"
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex min-w-0 grow basis-[20ch] flex-col gap-1">
        <label
          htmlFor="summary-range-from"
          className="text-sm font-medium leading-5 text-[var(--color-text)]"
        >
          {t('summary.filter.fromLabel')}
        </label>
        <input
          id="summary-range-from"
          data-testid="summary-from"
          type="date"
          value={from}
          aria-invalid={invalid}
          aria-describedby={message === null ? undefined : 'summary-range-error'}
          onChange={(event) => handleChange('from', event.target.value)}
          className={fieldClass}
        />
      </div>
      <div className="flex min-w-0 grow basis-[20ch] flex-col gap-1">
        <label
          htmlFor="summary-range-to"
          className="text-sm font-medium leading-5 text-[var(--color-text)]"
        >
          {t('summary.filter.toLabel')}
        </label>
        <input
          id="summary-range-to"
          data-testid="summary-to"
          type="date"
          value={to}
          aria-invalid={invalid}
          aria-describedby={message === null ? undefined : 'summary-range-error'}
          onChange={(event) => handleChange('to', event.target.value)}
          className={fieldClass}
        />
      </div>

      {message !== null && (
        <div
          id="summary-range-error"
          data-testid="summary-range-error"
          role="alert"
          className="flex w-full items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm leading-5"
        >
          <AlertIcon
            size={20}
            className="mt-0.5 flex-none text-[var(--color-danger)]"
          />
          <p className="min-w-0 font-medium text-[var(--color-text-strong)]">
            {message}
          </p>
        </div>
      )}

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <button
          type="submit"
          data-testid="summary-search"
          disabled={invalid}
          className="min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold leading-5 text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
        >
          {t('summary.filter.search')}
        </button>
        {showReset && (
          <button
            type="button"
            data-testid="summary-reset"
            onClick={handleReset}
            className="min-h-[44px] w-full rounded-[var(--radius-md)] px-4 text-sm font-semibold leading-5 text-[var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:flex-1"
          >
            {t('summary.filter.reset')}
          </button>
        )}
      </div>
    </form>
  );
}
