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
 * one row.
 */
export default function NetworkErrorOverlay({
  onRetry,
  title,
  description,
}: NetworkErrorOverlayProps) {
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 px-4">
      <section
        data-testid="network-error-overlay"
        role="alert"
        className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-6 text-center"
      >
        <h2 className="text-base font-semibold text-red-800">
          {title ?? t('punch.network.title')}
        </h2>
        <p className="max-w-md text-sm text-red-700">
          {description ?? t('punch.network.description')}
        </p>
        <button
          type="button"
          data-testid="network-retry"
          onClick={onRetry}
          className="min-h-[44px] w-full rounded-md bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800"
        >
          {t('punch.network.retry')}
        </button>
      </section>
    </div>
  );
}
