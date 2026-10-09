import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertIcon } from '../../components/icons';
import { LoadingState, ServerErrorState } from '../../components/states';
import type { DictKey } from '../../i18n/id';
import { useI18n } from '../../i18n/provider';
import { ApiError } from '../../services/api';
import { commitPhoto, putPhotoBytes, requestPhotoUpload } from '../../services/profile';

/** Largest profile photo the server accepts, in bytes. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** File types the server accepts for a profile photo. */
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png'];

/**
 * Client-side twin of the upload rule, checked the moment a file is picked:
 * only the accepted image types, never larger than the size limit. Returns
 * the dictionary key of the message to show, or `null` when the file may be
 * uploaded.
 */
export function validatePhotoFile(file: { type: string; size: number }): DictKey | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return 'profile.photo.error.type';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'profile.photo.error.size';
  }
  return null;
}

/** How a failed upload is reported back to the form. */
interface UploadError {
  /** Copy for the failure. */
  text: string;
  /** True when only the shared server-error state should show it. */
  fault: boolean;
}

/**
 * Classifies a failed upload: a file the server refuses is reported inline
 * next to the picker (the file has to change to pass), while an unreachable
 * server and anything else is a fault the shared server-error state owns —
 * nothing was committed, so it can say so and offer a retry of the same file.
 */
function describeError(error: unknown, t: (key: DictKey) => string): UploadError {
  if (error instanceof ApiError) {
    if (error.code === 'PHOTO_TYPE') {
      return {
        text: error.message !== '' ? error.message : t('profile.photo.error.type'),
        fault: false,
      };
    }
    if (error.code === 'PHOTO_TOO_LARGE') {
      return {
        text: error.message !== '' ? error.message : t('profile.photo.error.size'),
        fault: false,
      };
    }
    if (error.status === 0) {
      return { text: t('auth.error.network'), fault: true };
    }
  }
  return { text: t('auth.error.generic'), fault: true };
}

/**
 * Photo-change screen. The format and size limits are stated before the file
 * picker so the rule is known up front; a picked file is checked again
 * locally, then pushed straight to the storage server through a one-shot
 * upload URL and committed. While it is in flight the uploading state
 * reserves the space the result will occupy, a refused file is reported next
 * to the picker, and a server that never answered hands off to the shared
 * server-error state, which re-sends the same file. Cancelling leaves the
 * previous photo untouched.
 */
export default function ChangePhotoPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const inlineError = error !== null && !error.fault ? error.text : null;
  const faultTitle = error !== null && error.fault ? error.text : null;

  async function runUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const target = await requestPhotoUpload(file.type, file.size);
      await putPhotoBytes(target.presignedUrl, file.type, file);
      await commitPhoto(target.objectKey);
      navigate('/profil', { state: { flash: 'photo' } });
    } catch (caught) {
      setError(describeError(caught, t));
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the picker so choosing the same file again fires a fresh change.
    event.target.value = '';
    if (file === undefined) {
      return;
    }
    setError(null);
    const localError = validatePhotoFile(file);
    if (localError !== null) {
      setFileName(null);
      setPendingFile(null);
      setError({ text: t(localError), fault: false });
      return;
    }
    setFileName(file.name);
    setPendingFile(file);
    void runUpload(file);
  }

  return (
    <section data-testid="change-photo" className="space-y-6">
      <h1 className="text-xl font-bold leading-8 text-[var(--color-text-strong)]">
        {t('profile.photo.title')}
      </h1>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary-subtle)] px-3 py-2 text-sm leading-5">
          <AlertIcon
            size={20}
            className="mt-0.5 flex-none text-[var(--color-primary)]"
          />
          <p data-testid="photo-rules" className="min-w-0 text-[var(--color-text)]">
            {t('profile.photo.hint')}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="change-photo-file"
              className="text-sm font-medium leading-5 text-[var(--color-text)]"
            >
              {t('profile.photo.choose')}
            </label>
            <input
              id="change-photo-file"
              data-testid="photo-input"
              type="file"
              accept={ACCEPTED_PHOTO_TYPES.join(',')}
              disabled={uploading}
              aria-describedby={inlineError === null ? undefined : 'photo-error'}
              onChange={handleFileChange}
              className="mt-1 block min-h-[44px] w-full text-sm text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] file:mr-3 file:min-h-[44px] file:rounded-[var(--radius-sm)] file:border file:border-[var(--color-border)] file:bg-[var(--color-surface)] file:px-4 file:text-sm file:font-semibold file:text-[var(--color-text)] hover:file:bg-[var(--color-page)]"
            />
            {fileName !== null && (
              <p
                data-testid="photo-file"
                className="break-all text-sm leading-5 text-[var(--color-text-muted)]"
              >
                {fileName}
              </p>
            )}
            {uploading && (
              <div className="mt-1">
                <LoadingState label={t('profile.photo.uploading')} rows={1} />
              </div>
            )}
            {inlineError !== null && (
              <div
                id="photo-error"
                data-testid="photo-error"
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

          <div>
            <button
              type="button"
              data-testid="photo-cancel"
              onClick={() => navigate('/profil')}
              className="min-h-[44px] w-full rounded-[var(--radius-md)] px-4 text-sm font-semibold leading-5 text-[var(--color-text)] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-easing)] hover:bg-[var(--color-page)] hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>

        {faultTitle !== null && (
          <div className="mt-4">
            <ServerErrorState
              title={faultTitle}
              onRetry={() => {
                if (pendingFile !== null) {
                  void runUpload(pendingFile);
                }
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
