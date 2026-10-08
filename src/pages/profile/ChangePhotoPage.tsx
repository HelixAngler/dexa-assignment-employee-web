import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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

/**
 * Turns a failed upload into inline copy: an unreachable server gets the
 * connection copy, a rejected file gets the server's own explanation (or the
 * local rule text when it sent none), everything else gets a generic retry.
 */
function describeError(error: unknown, t: (key: DictKey) => string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return t('auth.error.network');
    }
    if (error.code === 'PHOTO_TYPE') {
      return error.message !== '' ? error.message : t('profile.photo.error.type');
    }
    if (error.code === 'PHOTO_TOO_LARGE') {
      return error.message !== '' ? error.message : t('profile.photo.error.size');
    }
  }
  return t('auth.error.generic');
}

/**
 * Photo-change screen. The format and size limits are stated before the file
 * picker so the rule is known up front; a picked file is checked again
 * locally, then pushed straight to the storage server through a one-shot
 * upload URL and committed. Every failure is reported inline, and cancelling
 * leaves the previous photo untouched.
 */
export default function ChangePhotoPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(t(localError));
      return;
    }
    setFileName(file.name);
    void runUpload(file);
  }

  return (
    <section data-testid="change-photo" className="w-full max-w-sm">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t('profile.photo.title')}
        </h1>
        <p
          data-testid="photo-rules"
          className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800"
        >
          {t('profile.photo.hint')}
        </p>

        <div className="mt-4">
          <label
            htmlFor="change-photo-file"
            className="block text-sm font-medium text-gray-700"
          >
            {t('profile.photo.choose')}
          </label>
          <input
            id="change-photo-file"
            data-testid="photo-input"
            type="file"
            accept={ACCEPTED_PHOTO_TYPES.join(',')}
            disabled={uploading}
            onChange={handleFileChange}
            className="mt-1 block min-h-[44px] w-full text-sm text-gray-700 file:mr-3 file:min-h-[44px] file:rounded-md file:border file:border-gray-300 file:bg-white file:px-4 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
          />
          {fileName !== null && (
            <p data-testid="photo-file" className="mt-1 text-sm text-gray-600">
              {fileName}
            </p>
          )}
          {uploading && (
            <p
              data-testid="photo-uploading"
              role="status"
              className="mt-1 text-sm text-gray-600"
            >
              {t('profile.photo.uploading')}
            </p>
          )}
          {error !== null && (
            <p
              id="photo-error"
              data-testid="photo-error"
              role="alert"
              className="mt-1 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </div>

        <div className="mt-4">
          <button
            type="button"
            data-testid="photo-cancel"
            onClick={() => navigate('/profil')}
            className="min-h-[44px] w-full rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </section>
  );
}
