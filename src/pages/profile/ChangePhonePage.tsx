import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, ServerErrorState } from '../../components/states';
import type { DictKey } from '../../i18n/id';
import { useI18n } from '../../i18n/provider';
import { ApiError } from '../../services/api';
import { fetchProfile, updatePhone } from '../../services/profile';

/**
 * Client-side mirror of the phone rule: digits, `+` and `-` only, and at
 * least 8 digits once everything else is stripped. Returns the dictionary key
 * of the message to show, or `null` when the value may be sent.
 */
export function validatePhone(value: string): DictKey | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return 'profile.phone.required';
  }
  if (/[^0-9+-]/.test(trimmed)) {
    return 'profile.phone.invalidChars';
  }
  if (trimmed.replace(/\D/g, '').length < 8) {
    return 'profile.phone.tooShort';
  }
  return null;
}

/** How a failed save is reported back to the form. */
interface SaveError {
  /** Copy for the failure. */
  text: string;
  /** True when only the shared server-error state should show it. */
  fault: boolean;
}

/**
 * Classifies a failed save: the server's own rejection of the number is an
 * inline message next to the field, while an unreachable server and anything
 * else is a fault the shared server-error state owns — nothing was written,
 * so it can say so and offer a retry of the same number.
 */
function describeError(error: unknown, t: (key: DictKey) => string): SaveError {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return { text: t('auth.error.network'), fault: true };
    }
    if (error.code === 'PHONE_INVALID') {
      return {
        text: error.message !== '' ? error.message : t('profile.phone.serverInvalid'),
        fault: false,
      };
    }
  }
  return { text: t('auth.error.generic'), fault: true };
}

const fieldClass =
  'mt-1 h-11 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600';

/**
 * Phone-change screen. It prefills the number currently on the profile and
 * checks the rule locally on every edit, so an invalid value is reported
 * inline before any request is made; the server's own rejection is shown the
 * same way. Saving returns to Profil carrying the success token, cancelling
 * returns without writing anything.
 */
export default function ChangePhonePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [phone, setPhone] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<SaveError | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchProfile();
      setPhone(next.phone);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const validationKey = validatePhone(phone);
  const showFieldError =
    validationKey !== null && (phone.trim() !== '' || submitAttempted);
  const rejectedValue = saveError !== null && !saveError.fault;
  const inlineError =
    rejectedValue && saveError !== null
      ? saveError.text
      : showFieldError && validationKey !== null
        ? t(validationKey)
        : null;
  const faultTitle = saveError !== null && saveError.fault ? saveError.text : null;

  async function submit() {
    if (submitting || phase !== 'ready') {
      return;
    }
    setSubmitAttempted(true);
    setSaveError(null);
    if (validatePhone(phone) !== null) {
      return;
    }
    setSubmitting(true);
    try {
      await updatePhone(phone.trim());
      navigate('/profil', { state: { flash: 'phone' } });
    } catch (caught) {
      setSaveError(describeError(caught, t));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

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
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('profile.phone.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('profile.phone.hint')}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="change-phone-number"
              className="block text-sm font-medium text-gray-700"
            >
              {t('profile.phoneLabel')}
            </label>
            <input
              id="change-phone-number"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-required="true"
              aria-invalid={inlineError !== null}
              aria-describedby={inlineError === null ? undefined : 'phone-error'}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setSaveError(null);
              }}
              className={fieldClass}
            />
            {inlineError !== null && (
              <p
                id="phone-error"
                data-testid="phone-error"
                role="alert"
                className="mt-1 text-sm text-red-700"
              >
                {inlineError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              data-testid="phone-cancel"
              onClick={() => navigate('/profil')}
              className="min-h-[44px] w-full rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-1"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              data-testid="phone-save"
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
    );
  }

  return (
    <section data-testid="change-phone" className="flex justify-center">
      {content}
    </section>
  );
}
