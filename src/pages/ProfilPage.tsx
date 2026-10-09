import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { EditIcon } from '../components/icons';
import {
  LoadingState,
  ServerErrorState,
  useSuccessToast,
} from '../components/states';
import type { DictKey } from '../i18n/id';
import { useI18n } from '../i18n/provider';
import type { Profile } from '../services/auth';
import { fetchProfile } from '../services/profile';

/**
 * Success feedback a change screen can hand back through the router location
 * state; the token selects which saved change the toast announces.
 */
const FLASH_KEYS: Record<string, DictKey> = {
  phone: 'profile.flash.phone',
  photo: 'profile.flash.photo',
  password: 'profile.flash.password',
};

/** Up to two initials of the employee's name, used by the photo-less avatar. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((part) => part !== '')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

/** Shared shape of the card surfaces on this screen. */
const cardClass =
  'rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]';

/**
 * Standalone edit affordance for one profile field: its own link with a
 * 44×44 pixel target, labelled for screen readers and carrying a pencil mark.
 * The photo card pairs the mark with its visible label; row affordances stay
 * icon-only.
 */
function EditLink({
  to,
  name,
  withLabel = false,
}: {
  to: string;
  name: string;
  withLabel?: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label={name}
      className={[
        'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]',
        withLabel ? 'px-3' : 'w-11',
      ].join(' ')}
    >
      <EditIcon size={20} />
      {withLabel && <span>{name}</span>}
    </Link>
  );
}

/** One label/value line; optional edit affordance sits on the trailing edge. */
function ProfileRow({
  labelKey,
  valueTestId,
  value,
  edit,
}: {
  labelKey: DictKey;
  valueTestId: string;
  value: string;
  edit?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[48px] items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-[var(--color-text-muted)]">
          {t(labelKey)}
        </p>
        <p
          data-testid={valueTestId}
          className="break-all text-base leading-6 text-[var(--color-text-strong)]"
        >
          {value}
        </p>
      </div>
      {edit}
    </div>
  );
}

/**
 * The employee's own profile: photo, read-only identity fields (name, company
 * email, position) and the two editable values — phone and password — each
 * paired with its own edit affordance that opens a dedicated change screen.
 * The whole page loads from the profile endpoint, so it also owns the loading
 * and retry states, and it announces the change a screen just saved.
 */
export default function ProfilPage() {
  const { t } = useI18n();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const { toast, show } = useSuccessToast();

  const load = useCallback(async () => {
    try {
      const next = await fetchProfile();
      setProfile(next);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const state = location.state as { flash?: unknown } | null;
  const flash = state === null || state === undefined ? undefined : state.flash;
  const flashKey = typeof flash === 'string' ? FLASH_KEYS[flash] : undefined;

  useEffect(() => {
    if (flashKey !== undefined) {
      show(t(flashKey));
    }
  }, [flashKey, show, t]);

  let content: ReactNode;
  if (phase === 'loading') {
    content = <LoadingState />;
  } else if (phase === 'error' || profile === null) {
    content = (
      <ServerErrorState
        onRetry={() => {
          setPhase('loading');
          void load();
        }}
      />
    );
  } else {
    const photoUrl = profile.photoUrl;
    const avatar: ReactNode =
      photoUrl !== null && photoUrl !== '' ? (
        <img
          data-testid="profile-photo"
          src={photoUrl}
          alt={t('profile.photo.alt')}
          className="h-20 w-20 shrink-0 rounded-full bg-[var(--color-page)] object-cover"
        />
      ) : (
        <div
          data-testid="profile-photo-placeholder"
          role="img"
          aria-label={t('profile.photo.alt')}
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-subtle)] text-xl font-bold text-[var(--color-primary)]"
        >
          {initials(profile.name) !== '' ? (
            <span aria-hidden="true">{initials(profile.name)}</span>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-10 w-10 fill-current"
            >
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
            </svg>
          )}
        </div>
      );

    content = (
      <>
        <h1 className="text-xl font-bold leading-8 text-[var(--color-text-strong)]">
          {t('profile.title')}
        </h1>

        <div
          className={`${cardClass} flex items-center gap-4 p-4`}
        >
          {avatar}
          <EditLink
            to="/profil/foto"
            name={t('profile.photo.edit')}
            withLabel
          />
        </div>

        <div className={`${cardClass} overflow-hidden`}>
          <ProfileRow
            labelKey="profile.nameLabel"
            valueTestId="profil-name"
            value={profile.name}
          />
          <ProfileRow
            labelKey="profile.emailLabel"
            valueTestId="profil-email"
            value={profile.email}
          />
          <ProfileRow
            labelKey="profile.positionLabel"
            valueTestId="profil-position"
            value={profile.position}
          />
          <ProfileRow
            labelKey="profile.phoneLabel"
            valueTestId="profil-phone"
            value={profile.phone}
            edit={
              <EditLink to="/profil/telepon" name={t('profile.phone.edit')} />
            }
          />
          <ProfileRow
            labelKey="profile.passwordLabel"
            valueTestId="profil-password"
            value={t('profile.password.masked')}
            edit={
              <EditLink
                to="/profil/kata-sandi"
                name={t('profile.password.edit')}
              />
            }
          />
        </div>
      </>
    );
  }

  return (
    <section data-testid="profil" className="space-y-6">
      {content}
      {toast}
    </section>
  );
}
