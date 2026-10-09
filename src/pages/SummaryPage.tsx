import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DateRangeFilter,
  SummaryTable,
  type DateRange,
  type SummaryDisplayRow,
} from '../components/summary';
import { LoadingState, ServerErrorState } from '../components/states';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import {
  fetchSummary,
  type SummaryQuery,
  type SummaryRow,
} from '../services/attendance';

/** Widest range we are willing to expand into one row per day. */
const MAX_FILL_DATES = 400;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** A calendar day as `YYYY-MM-DD`, read in the browser's own time zone. */
function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The range the screen opens with: first day of this month through today. */
export function defaultRange(now: Date = new Date()): DateRange {
  return {
    from: toIsoDay(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toIsoDay(now),
  };
}

/**
 * Every `YYYY-MM-DD` inside the bounds, inclusive. Returns `null` when a
 * bound is not a real day, the order is reversed, or the span is wider than
 * one row per day is worth — callers then skip the expansion.
 */
export function eachDateBetween(from: string, to: string): string[] | null {
  const parse = (value: string): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match === null) {
      return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const time = Date.UTC(year, month - 1, day);
    const roundTrip = new Date(time);
    if (
      roundTrip.getUTCFullYear() !== year ||
      roundTrip.getUTCMonth() !== month - 1 ||
      roundTrip.getUTCDate() !== day
    ) {
      return null;
    }
    return time;
  };

  const start = parse(from);
  const end = parse(to);
  if (start === null || end === null || start > end) {
    return null;
  }
  const span = Math.floor((end - start) / 86_400_000) + 1;
  if (span > MAX_FILL_DATES) {
    return null;
  }

  const days: string[] = [];
  for (let time = start; time <= end; time += 86_400_000) {
    const date = new Date(time);
    days.push(
      `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    );
  }
  return days;
}

/**
 * The attendance summary screen. It opens with the server's default range
 * (month start through today) fetched without any parameters while the
 * filter shows that same range, re-queries when a From–To pair is submitted,
 * and turns the served rows into one row per day of the queried range so a
 * day without a session still appears and says so.
 */
export default function SummaryPage() {
  const { t } = useI18n();
  const defaults = useMemo(() => defaultRange(), []);
  const [range, setRange] = useState<DateRange>(defaults);
  const [attempted, setAttempted] = useState<SummaryQuery | null>(null);
  const [loaded, setLoaded] = useState<SummaryQuery | null>(null);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [rangeRejected, setRangeRejected] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (query: SummaryQuery | null) => {
    const request = ++requestId.current;
    setAttempted(query);
    setRangeRejected(false);
    setPhase('loading');
    try {
      const body = await fetchSummary(query ?? {});
      if (request !== requestId.current) {
        return;
      }
      setRows(Array.isArray(body?.rows) ? body.rows : []);
      setLoaded(query);
      setPhase('ready');
    } catch (caught) {
      if (request !== requestId.current) {
        return;
      }
      if (
        caught instanceof ApiError &&
        caught.status === 400 &&
        caught.code === 'RANGE_INVALID'
      ) {
        // The listed rows still describe the range that was accepted.
        setRangeRejected(true);
        setPhase('ready');
      } else {
        setPhase('error');
      }
    }
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

  function handleSubmit(next: DateRange) {
    const query: SummaryQuery = {};
    if (next.from !== '') {
      query.from = next.from;
    }
    if (next.to !== '') {
      query.to = next.to;
    }
    setRange(next);
    void load(query);
  }

  function handleReset() {
    setRange(defaults);
    void load(null);
  }

  const displayRows = useMemo<SummaryDisplayRow[]>(() => {
    if (rows.length === 0) {
      return [];
    }
    const served: SummaryDisplayRow[] = rows.map((row) => ({ ...row }));
    const bounds = {
      from: loaded?.from ?? defaults.from,
      to: loaded?.to ?? defaults.to,
    };
    const days = eachDateBetween(bounds.from, bounds.to);
    if (days === null) {
      return served;
    }
    const known = new Set(served.map((row) => row.date));
    const filled: SummaryDisplayRow[] = [...served];
    for (const date of days) {
      if (!known.has(date)) {
        filled.push({ date, masuk: null, pulang: null, noData: true });
      }
    }
    filled.sort((a, b) => a.date.localeCompare(b.date));
    return filled;
  }, [rows, loaded, defaults]);

  let results: ReactNode;
  if (phase === 'loading') {
    results = <LoadingState />;
  } else if (phase === 'error') {
    results = (
      <ServerErrorState
        onRetry={() => {
          void load(attempted);
        }}
        actionVariant="secondary"
      />
    );
  } else {
    results = (
      <SummaryTable
        rows={displayRows}
        emptyTitle={t('summary.empty.title')}
        emptyDescription={t('summary.empty.description')}
      />
    );
  }

  return (
    <section data-testid="summary" className="space-y-6">
      <h1 className="text-xl font-bold leading-8 text-[var(--color-text-strong)]">
        {t('summary.title')}
      </h1>
      <DateRangeFilter
        from={range.from}
        to={range.to}
        defaultFrom={defaults.from}
        defaultTo={defaults.to}
        onChange={setRange}
        onSubmit={handleSubmit}
        onReset={handleReset}
        error={rangeRejected ? t('summary.filter.rangeInvalid') : null}
      />
      {results}
    </section>
  );
}
