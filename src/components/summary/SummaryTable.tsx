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
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      {open ? (
        <span
          data-testid="summary-still-working"
          className="text-gray-500 italic"
        >
          {t('summary.row.stillWorking')}
        </span>
      ) : (
        <span data-testid="summary-pulang">{formatClock(row.pulang, lang)}</span>
      )}
      {row.systemClosed === true && (
        <span
          data-testid="summary-system-closed"
          className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
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
        <tr className="border-b border-gray-200 text-gray-600">
          <th scope="col" className="py-2 pr-4 font-medium">
            {t('summary.table.date')}
          </th>
          <th scope="col" className="py-2 pr-4 font-medium">
            {t('summary.table.masuk')}
          </th>
          <th scope="col" className="py-2 font-medium">
            {t('summary.table.pulang')}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr
            key={row.date}
            data-testid="summary-row"
            data-date={row.date}
            className="text-gray-900"
          >
            <td className="py-2 pr-4">{row.date}</td>
            {row.noData === true ? (
              <td colSpan={2} className="py-2 text-gray-500">
                <span data-testid="summary-no-data">{t('summary.row.noData')}</span>
              </td>
            ) : (
              <>
                <td className="py-2 pr-4">
                  <span data-testid="summary-masuk">
                    {formatClock(row.masuk, lang)}
                  </span>
                </td>
                <td className="py-2">
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
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <p className="text-sm font-semibold text-gray-900">{row.date}</p>
          {row.noData === true ? (
            <p className="mt-1 text-sm text-gray-500">
              <span data-testid="summary-no-data">{t('summary.row.noData')}</span>
            </p>
          ) : (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-gray-500">{t('summary.table.masuk')}</dt>
                <dd className="tabular-nums text-gray-900">
                  <span data-testid="summary-masuk">
                    {formatClock(row.masuk, lang)}
                  </span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-gray-500">{t('summary.table.pulang')}</dt>
                <dd className="tabular-nums text-gray-900">
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
