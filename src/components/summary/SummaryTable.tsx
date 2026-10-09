import { EmptyState } from '../states';
import { useI18n, type Lang } from '../../i18n/provider';
import type { SummaryRow } from '../../services/attendance';

/** A served summary row plus the client-side marker for a session-less date. */
export interface SummaryDisplayRow extends SummaryRow {
  /** Set for a date inside the queried range that has no session at all. */
  noData?: boolean;
}

export interface SummaryTableProps {
  /** Rows to show, newest or oldest as the caller ordered them. */
  rows: SummaryDisplayRow[];
  /** Headline for the empty state; defaults to the shared empty copy. */
  emptyTitle?: string;
  /** Body copy for the empty state; defaults to the shared empty copy. */
  emptyDescription?: string;
}

/** Locale tag for the clock rendering in each UI language. */
function localeTag(lang: Lang): string {
  return lang === 'id' ? 'id-ID' : 'en-GB';
}

/**
 * Clock text for one punch value: full instants are shortened to hours and
 * minutes, anything already short (or unparseable) is shown as it arrived.
 */
function formatClock(value: string | null, lang: Lang): string {
  if (value === null) {
    return '';
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(localeTag(lang), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

interface CellProps {
  row: SummaryDisplayRow;
}

/** Pulang cell: still-working marker for an open session, plus the closure tag. */
function PulangCell({ row }: CellProps) {
  const { t, lang } = useI18n();
  const open = row.pulang === null;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {open ? (
        <span
          data-testid="summary-still-working"
          className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-page)] px-3 py-1 text-xs font-semibold leading-4 text-[var(--color-text)]"
        >
          {t('summary.row.stillWorking')}
        </span>
      ) : (
        <span data-testid="summary-pulang">{formatClock(row.pulang, lang)}</span>
      )}
      {row.systemClosed === true && (
        <span
          data-testid="summary-system-closed"
          className="inline-flex items-center rounded-full bg-[var(--color-attention-bg)] px-3 py-1 text-xs font-semibold leading-4 text-[var(--color-attention)]"
        >
          {t('summary.row.systemClosed')}
        </span>
      )}
    </span>
  );
}

/**
 * Desktop half of the summary: one row per date with Date, Masuk and Pulang
 * columns in tabular figures, so digits line up down the table.
 */
function SummaryTableDesktop({ rows }: { rows: SummaryDisplayRow[] }) {
  const { t, lang } = useI18n();

  return (
    <table
      data-testid="summary-table"
      className="hidden w-full border-collapse text-left text-sm tabular-nums md:table"
    >
      <thead>
        <tr className="border-b border-[var(--color-border)] text-[var(--color-text)]">
          <th
            scope="col"
            className="sticky top-0 z-10 bg-[var(--color-surface)] px-3 py-3 font-semibold"
          >
            {t('summary.table.date')}
          </th>
          <th
            scope="col"
            className="sticky top-0 z-10 bg-[var(--color-surface)] px-3 py-3 font-semibold"
          >
            {t('summary.table.masuk')}
          </th>
          <th
            scope="col"
            className="sticky top-0 z-10 bg-[var(--color-surface)] px-3 py-3 font-semibold"
          >
            {t('summary.table.pulang')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.date}
            data-testid="summary-row"
            data-date={row.date}
            className="border-b border-[var(--color-border)] text-[var(--color-text)] last:border-b-0 even:bg-[var(--color-page)]"
          >
            <td className="h-12 px-3">{row.date}</td>
            {row.noData === true ? (
              <td colSpan={2} className="h-12 px-3 text-[var(--color-text-muted)]">
                <span data-testid="summary-no-data">{t('summary.row.noData')}</span>
              </td>
            ) : (
              <>
                <td className="h-12 px-3">
                  <span data-testid="summary-masuk">
                    {formatClock(row.masuk, lang)}
                  </span>
                </td>
                <td className="h-12 px-3">
                  <PulangCell row={row} />
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Phone half of the summary: the same dates as standalone cards with
 * label/value lines, so nothing scrolls sideways on a narrow screen.
 */
function SummaryTableCards({ rows }: { rows: SummaryDisplayRow[] }) {
  const { t, lang } = useI18n();

  return (
    <ul data-testid="summary-cards" className="space-y-3 md:hidden">
      {rows.map((row) => (
        <li
          key={row.date}
          data-testid="summary-card"
          data-date={row.date}
          className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
        >
          <p className="m-0 text-base font-semibold leading-6 text-[var(--color-text-strong)] tabular-nums">
            {row.date}
          </p>
          {row.noData === true ? (
            <p className="m-0 text-sm leading-5 text-[var(--color-text-muted)]">
              <span data-testid="summary-no-data">{t('summary.row.noData')}</span>
            </p>
          ) : (
            <dl className="mt-2 flex flex-col gap-1 text-sm leading-5">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">
                  {t('summary.table.masuk')}
                </dt>
                <dd className="m-0 text-right tabular-nums text-[var(--color-text-strong)] [overflow-wrap:anywhere]">
                  <span data-testid="summary-masuk">
                    {formatClock(row.masuk, lang)}
                  </span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">
                  {t('summary.table.pulang')}
                </dt>
                <dd className="m-0 text-right tabular-nums text-[var(--color-text-strong)] [overflow-wrap:anywhere]">
                  <PulangCell row={row} />
                </dd>
              </div>
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The summary list in both paired layouts: columns on a wide screen, one
 * stacked card per date on a phone. A date with no session keeps its row and
 * says so, an open session has no Pulang time yet, a system-closed session
 * carries its own tag, and an empty list hands over to the empty state.
 */
export default function SummaryTable({
  rows,
  emptyTitle,
  emptyDescription,
}: SummaryTableProps) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      <SummaryTableDesktop rows={rows} />
      <SummaryTableCards rows={rows} />
    </div>
  );
}
