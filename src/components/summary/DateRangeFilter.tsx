import { type FormEvent } from 'react';
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

const fieldClass =
  'mt-1 h-11 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

/**
 * From–To picker above the summary list. The inputs are prefilled from the
 * range currently being shown, Cari hands the range back to the caller, and a
 * From date after the To date is reported inline and blocks the query so the
 * server never has to reject it.
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
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="summary-range-from"
            className="block text-sm font-medium text-gray-700"
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
        <div>
          <label
            htmlFor="summary-range-to"
            className="block text-sm font-medium text-gray-700"
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
      </div>

      {message !== null && (
        <p
          id="summary-range-error"
          data-testid="summary-range-error"
          role="alert"
          className="mt-2 text-sm text-red-700"
        >
          {message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          data-testid="summary-search"
          disabled={invalid}
          className="min-h-[44px] flex-1 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {t('summary.filter.search')}
        </button>
        {showReset && (
          <button
            type="button"
            data-testid="summary-reset"
            onClick={handleReset}
            className="min-h-[44px] flex-1 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('summary.filter.reset')}
          </button>
        )}
      </div>
    </form>
  );
}
