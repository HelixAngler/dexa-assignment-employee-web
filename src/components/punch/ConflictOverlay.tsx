import { useI18n } from '../../i18n/provider';

export interface ConflictOverlayProps {
  /** Refetches the punch state and dismisses this overlay. */
  onRefresh: () => void;
  /** Overrides the headline; defaults to the already-clocked-in copy. */
  title?: string;
  /** Overrides the body copy; defaults to the refresh guidance. */
  description?: string;
}

/**
 * Shown when the server refuses a punch because the recorded state no longer
 * matches what the screen showed (someone else punched from another tab, or
 * the session already closed). It states the conflict and offers exactly one
 * way forward: refresh the status, which re-reads the server state.
 */
export default function ConflictOverlay({
  onRefresh,
  title,
  description,
}: ConflictOverlayProps) {
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 px-4">
      <section
        data-testid="conflict-overlay"
        role="alert"
        className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-yellow-100 bg-yellow-50 px-4 py-6 text-center"
      >
        <h2 className="text-base font-semibold text-yellow-900">
          {title ?? t('punch.conflict.alreadyIn')}
        </h2>
        <p className="max-w-md text-sm text-yellow-800">
          {description ?? t('punch.conflict.description')}
        </p>
        <button
          type="button"
          data-testid="conflict-refresh"
          onClick={onRefresh}
          className="min-h-[44px] w-full rounded-md bg-gray-800 px-4 text-sm font-medium text-white hover:bg-gray-900"
        >
          {t('punch.conflict.refresh')}
        </button>
      </section>
    </div>
  );
}
