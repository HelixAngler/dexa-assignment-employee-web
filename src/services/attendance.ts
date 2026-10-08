import { apiFetch } from './api';

/** Base path of the attendance API on the same origin. */
export const ATTENDANCE_BASE = '/api/attendance';

/** Which edge of the work session a punch records. */
export type PunchDirection = 'masuk' | 'pulang';

/** Latest recorded punch as served by the punch-state endpoint. */
export interface LastPunch {
  direction?: string | null;
  at?: string | null;
}

/** Today's attendance state for the signed-in employee. */
export interface PunchState {
  status: 'belum_masuk' | 'bekerja';
  clockInAt?: string | null;
  lastPunch?: LastPunch | string | null;
}

/** Server answer to a recorded punch; `at` comes from the server clock. */
export interface PunchResult {
  sessionId: string;
  direction: PunchDirection;
  at: string;
}

/** One day of the attendance summary as the endpoint returns it. */
export interface SummaryRow {
  /** Calendar day the session belongs to, `YYYY-MM-DD`, ordered ascending. */
  date: string;
  /** Clock-in instant, or `null` when the day carries no session. */
  masuk: string | null;
  /** Clock-out instant; `null` while the session is still open. */
  pulang: string | null;
  /** Present and `true` while the session has not been clocked out yet. */
  open?: boolean;
  /** Present and `true` when the job closed the session after the day ended. */
  systemClosed?: boolean;
}

/** Server body of the summary endpoint. */
export interface SummaryResponse {
  rows: SummaryRow[];
}

/** Optional From–To bounds; an omitted bound keeps the server default. */
export interface SummaryQuery {
  from?: string;
  to?: string;
}

/**
 * Reads the signed-in employee's own summary. Called with no bounds the
 * server falls back to its default range, so the very first load sends no
 * query string at all; a chosen range is passed through as-is.
 */
export function fetchSummary(query: SummaryQuery = {}): Promise<SummaryResponse> {
  const params = new URLSearchParams();
  if (query.from !== undefined && query.from !== '') {
    params.set('from', query.from);
  }
  if (query.to !== undefined && query.to !== '') {
    params.set('to', query.to);
  }
  const search = params.toString();
  return apiFetch<SummaryResponse>(
    `${ATTENDANCE_BASE}/summary${search === '' ? '' : `?${search}`}`,
  );
}


/** Reads today's punch state; rejects with a typed `ApiError` on failure. */
export function fetchPunchState(): Promise<PunchState> {
  return apiFetch<PunchState>(`${ATTENDANCE_BASE}/punches/state`);
}

/**
 * Records a punch. The caller supplies the idempotency key so a retry after
 * a network failure reuses it and the server answers with the original
 * result instead of writing a second row.
 */
export function punch(
  direction: PunchDirection,
  idempotencyKey: string,
): Promise<PunchResult> {
  return apiFetch<PunchResult>(`${ATTENDANCE_BASE}/punches`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ direction }),
  });
}
