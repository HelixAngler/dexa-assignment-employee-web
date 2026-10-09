import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertIcon } from '../../components/icons';
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

/** Field box: 44 px floor, token colours, primary focus ring. */
const fieldClass =
  'mt-1 min-h-[44px] w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base leading-6 text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-page)] disabled:text-[var(--color-text-muted)]';

/** Primary save and ghost cancel of the action row. */
const saveClass =
  'min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold leading-5 text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1';
const cancelClass =
  'min-h-[44px] w-full rounded-[var(--radius-md)] px-4 text-sm font-semibold leading-5 text-[var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:flex-1';

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
      <>
        <h1 className="text-xl font-bold leading-8 text-[var(--color-text-strong)]">
          {t('profile.phone.title')}
        </h1>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="change-phone-number"
                className="text-sm font-medium leading-5 text-[var(--color-text)]"
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
                aria-describedby={
                  inlineError === null ? 'phone-hint' : 'phone-hint phone-error'
                }
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setSaveError(null);
                }}
                className={fieldClass}
              />
              <p
                id="phone-hint"
                className="text-sm leading-5 text-[var(--color-text-muted)]"
              >
                {t('profile.phone.hint')}
              </p>
              {inlineError !== null && (
                <div
                  id="phone-error"
                  data-testid="phone-error"
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
                data-testid="phone-save"
                disabled={submitting}
                aria-busy={submitting}
                className={saveClass}
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                data-testid="phone-cancel"
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
      </>
    );
  }

  return (
    <section data-testid="change-phone" className="space-y-6">
      {content}
    </section>
  );
}
