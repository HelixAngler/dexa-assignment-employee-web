import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ConflictOverlay, NetworkErrorOverlay } from '../components/punch';
import { LoadingState, ServerErrorState, useSuccessToast } from '../components/states';
import type { DictKey } from '../i18n/id';
import { useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import {
  fetchPunchState,
  punch,
  type LastPunch,
  type PunchDirection,
  type PunchState,
} from '../services/attendance';

/** One punch submission: the direction and the key identifying it. */
interface PunchAttempt {
  direction: PunchDirection;
  key: string;
}

/** Detail rendered behind the conflict overlay. */
interface ConflictInfo {
  title: string;
  description: string;
}

/** Locale tag used for dates and clocks in each UI language. */
function localeTag(lang: string): string {
  return lang === 'id' ? 'id-ID' : 'en-GB';
}

/** Formats an ISO instant as a bare clock time, e.g. "08:30". */
function formatClock(iso: string, lang: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(localeTag(lang), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

/** Renders the last-punch line value, tolerating object or plain-text shapes. */
function formatLastPunch(
  lastPunch: LastPunch | string | null | undefined,
  t: (key: DictKey) => string,
  lang: string,
): string | null {
  if (lastPunch === null || lastPunch === undefined) {
    return null;
  }
  if (typeof lastPunch === 'string') {
    return lastPunch;
  }
  const directionKey: DictKey =
    lastPunch.direction === 'pulang'
      ? 'absen.direction.pulang'
      : 'absen.direction.masuk';
  const time =
    typeof lastPunch.at === 'string' ? formatClock(lastPunch.at, lang) : '';
  const parts = [t(directionKey), time].filter((part) => part !== '');
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Today's attendance screen. It loads the punch state first, then shows the
 * status pill, the clock-in hero and the last punch inside a status card,
 * with the single primary action under it: clock in while no session is
 * open, clock out while one is. Each submission carries a fresh idempotency
 * key that survives failures, so retrying after a dropped connection cannot
 * record a second row, and a punch the server did record is announced with
 * the success toast. The conflict and offline answers replace the reserved
 * punch layout with an overlay, so nothing underneath shifts.
 */
export default function AbsenPage() {
  const { t, lang } = useI18n();
  const { toast, show } = useSuccessToast();
  const [state, setState] = useState<PunchState | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState<PunchAttempt | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [networkDown, setNetworkDown] = useState(false);
  const [punchError, setPunchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchPunchState();
      setState(next);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runPunch = useCallback(
    async (pending: PunchAttempt) => {
      setSubmitting(true);
      setConflict(null);
      setNetworkDown(false);
      setPunchError(false);
      try {
        await punch(pending.direction, pending.key);
        setAttempt(null);
        await load();
        show(
          t(
            pending.direction === 'masuk'
              ? 'absen.flash.masuk'
              : 'absen.flash.pulang',
          ),
        );
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 409) {
          // The server wrote nothing; the key stays consumed for this body.
          setAttempt(null);
          setConflict({
            title:
              caught.code === 'NO_OPEN_SESSION'
                ? t('punch.conflict.noOpen')
                : t('punch.conflict.alreadyIn'),
            description:
              caught.message !== ''
                ? caught.message
                : t('punch.conflict.description'),
          });
        } else if (caught instanceof ApiError && caught.status === 0) {
          // The attempt is kept so a retry reuses the same idempotency key.
          setNetworkDown(true);
        } else {
          setPunchError(true);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [load, t, show],
  );

  function handlePunch() {
    if (state === null || submitting || attempt !== null) {
      return;
    }
    const direction: PunchDirection =
      state.status === 'belum_masuk' ? 'masuk' : 'pulang';
    const pending: PunchAttempt = {
      direction,
      key: crypto.randomUUID(),
    };
    setAttempt(pending);
    void runPunch(pending);
  }

  function handleRetry() {
    if (attempt !== null && !submitting) {
      void runPunch(attempt);
    }
  }

  async function handleConflictRefresh() {
    setConflict(null);
    await load();
  }

  const today = new Intl.DateTimeFormat(localeTag(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const working = state?.status === 'bekerja';
  const clockInIso =
    working && typeof state?.clockInAt === 'string' && state.clockInAt !== ''
      ? state.clockInAt
      : null;
  const lastPunchLine =
    state === null ? null : formatLastPunch(state.lastPunch, t, lang);

  // The clock-in hero keeps the label and the big time on separate lines
  // while still reading as the dictionary sentence for assistive technology.
  const clockParts =
    clockInIso === null
      ? null
      : (() => {
          const [label, tail] = t('absen.clockIn').split('{time}');
          return {
            label: label.trim(),
            time: `${formatClock(clockInIso, lang)}${tail}`,
          };
        })();

  let content: ReactNode;
  if (phase === 'loading') {
    content = <LoadingState />;
  } else if (phase === 'error') {
    content = (
      <ServerErrorState
        onRetry={() => {
          setPhase('loading');
          void load();
        }}
      />
    );
  } else {
    content = (
      <>
        <div>
          <h1 className="text-xl font-bold leading-8 text-[var(--color-text-strong)]">
            {t('absen.title')}
          </h1>
          <p
            data-testid="absen-today"
            className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]"
          >
            {t('absen.todayLabel')}: {today}
          </p>
        </div>

        <div className="relative">
          <div className="flex flex-col items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <span
              data-testid="absen-status"
              className={
                working
                  ? 'inline-flex items-center rounded-full bg-[var(--color-success-bg)] px-3 py-1 text-xs font-semibold leading-4 text-[var(--color-success)]'
                  : 'inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-page)] px-3 py-1 text-xs font-semibold leading-4 text-[var(--color-text)]'
              }
            >
              {working ? t('absen.status.bekerja') : t('absen.status.belumMasuk')}
            </span>

            {clockParts !== null && (
              <p data-testid="absen-clock-in" className="flex flex-col gap-1">
                <span className="text-sm leading-5 text-[var(--color-text-muted)]">
                  {clockParts.label}
                </span>{' '}
                <span className="text-2xl font-bold leading-10 tabular-nums text-[var(--color-text-strong)]">
                  {clockParts.time}
                </span>
              </p>
            )}

            {lastPunchLine !== null && (
              <p
                data-testid="absen-last-punch"
                className="text-base leading-6 tabular-nums text-[var(--color-text)]"
              >
                {t('absen.lastPunchLabel')}: {lastPunchLine}
              </p>
            )}
          </div>

          {punchError && (
            <div className="mt-4">
              <ServerErrorState
                onRetry={handleRetry}
                actionVariant="secondary"
              />
            </div>
          )}

          <button
            type="button"
            data-testid="punch-button"
            disabled={submitting}
            aria-busy={submitting}
            onClick={handlePunch}
            className="mt-6 min-h-[56px] w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-lg font-semibold leading-7 tracking-[0.04em] text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {working ? t('absen.punch.pulang') : t('absen.punch.masuk')}
          </button>

          {conflict !== null && (
            <ConflictOverlay
              title={conflict.title}
              description={conflict.description}
              onRefresh={() => void handleConflictRefresh()}
            />
          )}
          {networkDown && <NetworkErrorOverlay onRetry={handleRetry} />}
        </div>
      </>
    );
  }

  return (
    <section data-testid="absen" className="max-w-[60ch] space-y-6">
      {content}
      {toast}
    </section>
  );
}
