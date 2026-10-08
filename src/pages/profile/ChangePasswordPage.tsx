import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DictKey } from '../../i18n/id';
import { useI18n } from '../../i18n/provider';
import { ApiError } from '../../services/api';
import { changePassword } from '../../services/profile';

/** Shortest replacement password the strength rule accepts. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Turns a failed change into inline copy: an unreachable server gets the
 * connection copy, a rejected replacement shows the server's own explanation
 * (or the local rule text when it sent none), a wrong current password gets
 * the same treatment, and everything else falls back to a generic retry.
 */
function describeError(error: unknown, t: (key: DictKey) => string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return t('auth.error.network');
    }
    if (error.code === 'PASSWORD_WEAK') {
      return error.message !== '' ? error.message : t('profile.password.error.weak');
    }
    if (error.status === 401) {
      return error.message !== ''
        ? error.message
        : t('profile.password.error.currentWrong');
    }
  }
  return t('auth.error.generic');
}

const fieldClass =
  'mt-1 h-11 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

/**
 * Self-service password change: the current password proves ownership, the
 * replacement is checked against the length rule and matched against its
 * confirmation before anything is sent, and the server's strength verdict is
 * shown inline. The screen also states that the present session survives
 * while other devices are signed out, so the outcome is not a surprise.
 */
export default function ChangePasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setError(null);
    if (currentPassword === '') {
      setError(t('profile.password.error.currentRequired'));
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('profile.password.error.tooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('profile.password.mismatch'));
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

          {error !== null && (
            <p
              id="password-error"
              data-testid="password-error"
              role="alert"
              className="text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              data-testid="password-cancel"
              onClick={() => navigate('/profil')}
              className="min-h-[44px] flex-1 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              data-testid="password-save"
              disabled={submitting}
              aria-busy={submitting}
              className="min-h-[44px] flex-1 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
