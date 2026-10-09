import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertIcon } from '../../components/icons';
import { ServerErrorState } from '../../components/states';
import type { DictKey } from '../../i18n/id';
import { useI18n } from '../../i18n/provider';
import { ApiError } from '../../services/api';
import { changePassword } from '../../services/profile';

/** Shortest replacement password the strength rule accepts. */
const MIN_PASSWORD_LENGTH = 8;

/** How a failed change is reported back to the form. */
interface ChangeError {
  /** Copy for the failure. */
  text: string;
  /** True when only the shared server-error state should show it. */
  fault: boolean;
}

/**
 * Classifies a failed change: a rejected replacement and a wrong current
 * password are shown next to the fields (the input has to change to pass),
 * while an unreachable server and anything else is a fault the shared
 * server-error state owns — nothing was written, so it can say so and offer
 * a retry of the same values.
 */
function describeError(error: unknown, t: (key: DictKey) => string): ChangeError {
  if (error instanceof ApiError) {
    if (error.code === 'PASSWORD_WEAK') {
      return {
        text: error.message !== '' ? error.message : t('profile.password.error.weak'),
        fault: false,
      };
    }
    if (error.status === 401) {
      return {
        text:
          error.message !== ''
            ? error.message
            : t('profile.password.error.currentWrong'),
        fault: false,
      };
    }
    if (error.status === 0) {
      return { text: t('auth.error.network'), fault: true };
    }
  }
  return { text: t('auth.error.generic'), fault: true };
}

/** Field box: 44 px floor, token colours, primary focus ring. */
const fieldClass =
  'mt-1 min-h-[44px] w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base leading-6 text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-page)] disabled:text-[var(--color-text-muted)]';

/** Primary save and ghost cancel of the action row. */
const saveClass =
  'min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold leading-5 text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1';
const cancelClass =
  'min-h-[44px] w-full rounded-[var(--radius-md)] px-4 text-sm font-semibold leading-5 text-[var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:flex-1';

/**
 * Self-service password change: the current password proves ownership, the
 * replacement is checked against the length rule and matched against its
 * confirmation before anything is sent, and the server's strength verdict is
 * shown inline while an unreachable server hands off to the shared
 * server-error state, which retries the same values. The screen also states
 * that the present session survives while other devices are signed out, so
 * the outcome is not a surprise.
 */
export default function ChangePasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ChangeError | null>(null);

  const inlineError =
    error !== null && !error.fault
      ? error.text
      : null;
  const faultTitle = error !== null && error.fault ? error.text : null;

  async function submit() {
    if (submitting) {
      return;
    }
    setError(null);
    if (currentPassword === '') {
      setError({ text: t('profile.password.error.currentRequired'), fault: false });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError({ text: t('profile.password.error.tooShort'), fault: false });
      return;
    }
    if (newPassword !== confirmPassword) {
      setError({ text: t('profile.password.mismatch'), fault: false });
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate('/profil', { state: { flash: 'password' } });
    } catch (caught) {
      setError(describeError(caught, t));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <section data-testid="change-password" className="space-y-6">
      <h1 className="text-xl font-bold leading-8 text-[var(--color-text-strong)]">
        {t('profile.password.title')}
      </h1>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] px-3 py-2 text-sm leading-5">
          <AlertIcon
            size={20}
            className="mt-0.5 flex-none text-[var(--color-primary)]"
          />
          <p
            data-testid="password-note"
            className="min-w-0 text-[var(--color-text)]"
          >
            {t('profile.password.note')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="change-password-current"
              className="text-sm font-medium leading-5 text-[var(--color-text)]"
            >
              {t('profile.password.currentLabel')}
            </label>
            <input
              id="change-password-current"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              aria-required="true"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setError(null);
              }}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="change-password-new"
              className="text-sm font-medium leading-5 text-[var(--color-text)]"
            >
              {t('profile.password.newLabel')}
            </label>
            <input
              id="change-password-new"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              aria-required="true"
              aria-describedby="password-rules"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError(null);
              }}
              className={fieldClass}
            />
            <ul
              id="password-rules"
              data-testid="password-rules"
              className="list-disc space-y-1 pl-6 text-sm leading-5 text-[var(--color-text-muted)]"
            >
              <li>{t('profile.password.hint.min')}</li>
              <li>{t('profile.password.hint.printable')}</li>
              <li>{t('profile.password.hint.avoidCommon')}</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="change-password-confirm"
              className="text-sm font-medium leading-5 text-[var(--color-text)]"
            >
              {t('profile.password.confirmLabel')}
            </label>
            <input
              id="change-password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-required="true"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError(null);
              }}
              className={fieldClass}
            />
            {inlineError !== null && (
              <div
                id="password-error"
                data-testid="password-error"
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm leading-5"
              >
                <AlertIcon
                  size={20}
                  className="mt-0.5 flex-none text-[var(--color-danger)]"
                />
                <p className="min-w-0 font-medium text-[var(--color-text-strong)]">
                  {inlineError}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              data-testid="password-save"
              disabled={submitting}
              aria-busy={submitting}
              className={saveClass}
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              data-testid="password-cancel"
              onClick={() => navigate('/profil')}
              className={cancelClass}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>

        {faultTitle !== null && (
          <div className="mt-4">
            <ServerErrorState
              title={faultTitle}
              onRetry={() => void submit()}
              actionVariant="secondary"
            />
          </div>
        )}
      </div>
    </section>
  );
}
