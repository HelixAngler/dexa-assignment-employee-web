import { useI18n } from '../../i18n/provider';

export interface NetworkErrorOverlayProps {
  /**
   * Replays the punch that failed. Callers must pass the same idempotency
   * key as the failed attempt so the server cannot record a second row.
   */
  onRetry: () => void;
  /** Overrides the headline; defaults to the connection-failure copy. */
  title?: string;
  /** Overrides the body copy; defaults to the no-data-lost reassurance. */
  description?: string;
}

/**
 * Shown when a punch never reached the server. It reassures the user that
 * nothing was lost and offers a retry; retrying reuses the very same
 * idempotency key, so a request the server did receive still yields exactly
 * one row. The panel sits on a danger surface over the reserved punch layout,
 * so the card and button underneath keep their height and nothing shifts.
 */
export default function NetworkErrorOverlay({
  onRetry,
  title,
  description,
}: NetworkErrorOverlayProps) {
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)] px-4 py-6">
      <section
        data-testid="network-error-overlay"
        role="alert"
        className="flex w-full max-w-[48ch] flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-danger-bg)] p-6 text-center shadow-[var(--shadow-raised)]"
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
          className="h-8 w-8 flex-none text-[var(--color-danger)]"
        >
          <path d="M5 12.5a7 7 0 0 1 14 0" />
          <path d="M8.5 15.5a3.5 3.5 0 0 1 7 0" />
          <path d="M12 19h.01" />
          <path d="m4 4 16 16" />
        </svg>
        <h2 className="text-lg font-semibold leading-7 text-[var(--color-text-strong)]">
          {title ?? t('punch.network.title')}
        </h2>
        <p className="text-sm leading-5 text-[var(--color-text)]">
          {description ?? t('punch.network.description')}
        </p>
        <button
          type="button"
          data-testid="network-retry"
          onClick={onRetry}
          className="min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold leading-5 text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {t('punch.network.retry')}
        </button>
      </section>
    </div>
  );
}
