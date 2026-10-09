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
 * status, the last punch and the single primary action: clock in while no
 * session is open, clock out while one is. Each submission carries a fresh
 * idempotency key that survives failures, so retrying after a dropped
 * connection cannot record a second row, and a punch the server did record
 * is announced with the success toast.
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
  const clockInLine =
    working && typeof state?.clockInAt === 'string' && state.clockInAt !== ''
      ? t('absen.clockIn').replace('{time}', formatClock(state.clockInAt, lang))
      : null;
  const lastPunchLine =
    state === null ? null : formatLastPunch(state.lastPunch, t, lang);

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
      <div className="relative">
        <h1 className="text-2xl font-semibold">{t('absen.title')}</h1>
        <p data-testid="absen-today" className="mt-1 text-sm text-gray-500">
          {t('absen.todayLabel')}: {today}
        </p>

        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p
            data-testid="absen-status"
            className="text-lg font-semibold text-gray-900"
          >
            {working ? t('absen.status.bekerja') : t('absen.status.belumMasuk')}
          </p>
          {clockInLine !== null && (
            <p
              data-testid="absen-clock-in"
              className="mt-1 text-sm text-gray-600"
            >
              {clockInLine}
            </p>
          )}
          {lastPunchLine !== null && (
            <p
              data-testid="absen-last-punch"
              className="mt-1 text-sm text-gray-500"
            >
              {t('absen.lastPunchLabel')}: {lastPunchLine}
            </p>
          )}
        </div>

        {punchError && (
          <div className="mt-4">
            <ServerErrorState onRetry={handleRetry} />
          </div>
        )}

        <button
          type="button"
          data-testid="punch-button"
          disabled={submitting}
          aria-busy={submitting}
          onClick={handlePunch}
          className="mt-4 min-h-[56px] w-full rounded-md bg-blue-600 px-4 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
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
    );
  }

  return (
    <section data-testid="absen" className="space-y-4">
      {content}
      {toast}
    </section>
  );
}
