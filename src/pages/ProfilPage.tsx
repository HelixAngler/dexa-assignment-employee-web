import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

/**
 * Standalone edit affordance for one profile field: its own link with a
 * 44×44 pixel target, labelled for screen readers and carrying a pencil mark.
 */
function EditLink({ to, name }: { to: string; name: string }) {
  return (
    <Link
      to={to}
      aria-label={name}
      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-lg text-gray-500 hover:bg-gray-100 hover:text-blue-700"
    >
      <span aria-hidden="true">✎</span>
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
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700">{t(labelKey)}</p>
        <p data-testid={valueTestId} className="break-all text-sm text-gray-900">
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
          className="h-20 w-20 shrink-0 rounded-full bg-gray-100 object-cover"
        />
      ) : (
        <div
          data-testid="profile-photo-placeholder"
          role="img"
          aria-label={t('profile.photo.alt')}
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-500"
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
        <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>

        <div className="mt-4 flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {avatar}
          <EditLink to="/profil/foto" name={t('profile.photo.edit')} />
        </div>

        <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white px-4 shadow-sm">
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
    <section data-testid="profil" className="space-y-4">
      {content}
      {toast}
    </section>
  );
}
