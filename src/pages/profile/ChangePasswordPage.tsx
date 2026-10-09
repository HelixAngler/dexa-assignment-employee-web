import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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

const fieldClass =
  'mt-1 h-11 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

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
    <section data-testid="change-password" className="w-full max-w-sm">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('profile.password.title')}
        </h1>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="change-password-current"
              className="block text-sm font-medium text-gray-700"
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

          <div>
            <label
              htmlFor="change-password-new"
              className="block text-sm font-medium text-gray-700"
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
              className="mt-1 space-y-0.5 text-sm text-gray-500"
            >
              <li>{t('profile.password.hint.min')}</li>
              <li>{t('profile.password.hint.printable')}</li>
              <li>{t('profile.password.hint.avoidCommon')}</li>
            </ul>
          </div>

          <div>
            <label
              htmlFor="change-password-confirm"
              className="block text-sm font-medium text-gray-700"
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
          </div>

          <p
            data-testid="password-note"
            className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600"
          >
            {t('profile.password.note')}
          </p>

          {inlineError !== null && (
            <p
              id="password-error"
              data-testid="password-error"
              role="alert"
              className="text-sm text-red-700"
            >
              {inlineError}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              data-testid="password-cancel"
              onClick={() => navigate('/profil')}
              className="min-h-[44px] w-full rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-1"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              data-testid="password-save"
              disabled={submitting}
              aria-busy={submitting}
              className="min-h-[44px] w-full rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:flex-1"
            >
              {t('common.save')}
            </button>
          </div>
        </form>

        {faultTitle !== null && (
          <div className="mt-4">
            <ServerErrorState title={faultTitle} onRetry={() => void submit()} />
          </div>
        )}
      </div>
    </section>
  );
}
