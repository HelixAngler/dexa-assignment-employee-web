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
