import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertIcon } from '../components/icons';
import { ServerErrorState } from '../components/states';
import { LanguageToggle, useI18n } from '../i18n/provider';
import { ApiError } from '../services/api';
import { useSession } from '../services/session';

/** Which user-facing message a failed sign-in attempt maps to. */
type LoginErrorKind = 'invalid' | 'locked' | 'network' | 'generic';

interface LoginErrorView {
  kind: LoginErrorKind;
  attemptsRemaining?: number;
}

/**
 * Classifies a thrown sign-in failure: unreachable server, lockout, rejected
 * credentials (with the attempts the server still allows) and everything
 * else, which falls back to a generic retry message.
 */
function toLoginErrorView(error: unknown): LoginErrorView {
  if (!(error instanceof ApiError)) {
    return { kind: 'generic' };
  }
  if (error.status === 0) {
    return { kind: 'network' };
  }
  if (error.code === 'AUTH_LOCKED' || error.status === 423) {
    return { kind: 'locked' };
  }
  if (error.code === 'AUTH_INVALID' || error.status === 401) {
    return { kind: 'invalid', attemptsRemaining: error.attemptsRemaining };
  }
  return { kind: 'generic' };
}

/** Transport faults that the shared server-error state should own. */
function isServerFault(kind: LoginErrorKind): boolean {
  return kind === 'network' || kind === 'generic';
}

/** Field box shared by both sign-in inputs: 44 px floor, token colours. */
const fieldClass =
  'mt-1 min-h-[44px] w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base leading-6 text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-page)] disabled:text-[var(--color-text-muted)]';

/**
 * Sign-in screen. One generic failure message covers every rejected
 * credential, optionally extended with how many attempts the server still
 * allows; lockout keeps its own copy and renders as an attention notice
 * above an inert form with no primary action. A failure that is the
 * server's or the connection's fault is handed to the shared server-error
 * state, which says nothing changed and offers a retry that re-sends the
 * same credentials. A successful submit routes to the forced password
 * screen when the account still uses a temporary password, otherwise
 * straight to Absen.
 */
export default function LoginPage() {
  const { t } = useI18n();
  const { login } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<LoginErrorView | null>(null);

  const errorText =
    error === null
      ? null
      : error.kind === 'invalid'
        ? t('login.error.invalid')
        : error.kind === 'locked'
          ? t('login.error.locked')
          : error.kind === 'network'
            ? t('auth.error.network')
            : t('auth.error.generic');

  const locked = error !== null && error.kind === 'locked';

  async function attempt() {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await login(email, password);
      navigate(session.mustChangePassword ? '/first-login' : '/absen', {
        replace: true,
      });
    } catch (caught) {
      setError(toLoginErrorView(caught));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void attempt();
  }

  return (
    <section
      data-testid="login"
      className="flex min-h-[100dvh] flex-col bg-[var(--color-page)] text-base leading-6 text-[var(--color-text)]"
    >
      <div className="flex items-center justify-end px-4 py-3 md:px-6">
        <LanguageToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-[36ch] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold leading-5 text-[var(--color-primary)]">
            {t('shell.appTitle')}
          </p>
          <h1 className="mt-1 text-xl font-bold leading-8 text-[var(--color-text-strong)]">
            {t('login.title')}
          </h1>

          {locked && errorText !== null && (
            <div
              role="status"
              data-testid="login-error"
              className="mt-6 flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-attention-bg)] px-3 py-2 text-sm leading-5"
            >
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-5 w-5 flex-none text-[var(--color-attention)]"
              >
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <p className="min-w-0 font-medium text-[var(--color-attention)]">
                {errorText}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="login-email"
                className="text-sm font-medium leading-5 text-[var(--color-text)]"
              >
                {t('login.emailLabel')}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={locked}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="login-password"
                className="text-sm font-medium leading-5 text-[var(--color-text)]"
              >
                {t('login.passwordLabel')}
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={locked}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
              />
              {!locked &&
                error !== null &&
                !isServerFault(error.kind) &&
                errorText !== null && (
                  <div
                    role="alert"
                    data-testid="login-error"
                    className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm leading-5"
                  >
                    <AlertIcon
                      size={20}
                      className="mt-0.5 flex-none text-[var(--color-danger)]"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--color-text-strong)]">
                        {errorText}
                      </p>
                      {error.kind === 'invalid' &&
                        typeof error.attemptsRemaining === 'number' && (
                          <p
                            data-testid="login-attempts"
                            className="mt-1 text-[var(--color-text)]"
                          >
                            {t('login.error.attemptsRemaining').replace(
                              '{count}',
                              String(error.attemptsRemaining),
                            )}
                          </p>
                        )}
                    </div>
                  </div>
                )}
            </div>

            {error !== null && isServerFault(error.kind) && errorText !== null && (
              <ServerErrorState
                title={errorText}
                onRetry={() => void attempt()}
                actionVariant="secondary"
              />
            )}

            {!locked && (
              <button
                type="submit"
                data-testid="login-submit"
                disabled={submitting}
                aria-busy={submitting}
                className="min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold leading-5 text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t('login.submit')}
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
