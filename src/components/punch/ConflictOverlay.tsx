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
 * way forward: refresh the status, which re-reads the server state. The panel
 * sits on an attention surface over the reserved punch layout, so the card
 * and button underneath keep their height and nothing shifts.
 */
export default function ConflictOverlay({
  onRefresh,
  title,
  description,
}: ConflictOverlayProps) {
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)] px-4 py-6">
      <section
        data-testid="conflict-overlay"
        role="alert"
        className="flex w-full max-w-[48ch] flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-attention-bg)] p-6 text-center shadow-[var(--shadow-raised)]"
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
          className="h-8 w-8 flex-none text-[var(--color-attention)]"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16.5h.01" />
        </svg>
        <h2 className="text-lg font-semibold leading-7 text-[var(--color-text-strong)]">
          {title ?? t('punch.conflict.alreadyIn')}
        </h2>
        <p className="text-sm leading-5 text-[var(--color-text)]">
          {description ?? t('punch.conflict.description')}
        </p>
        <button
          type="button"
          data-testid="conflict-refresh"
          onClick={onRefresh}
          className="min-h-[44px] w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold leading-5 text-[var(--color-on-primary)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {t('punch.conflict.refresh')}
        </button>
      </section>
    </div>
  );
}
