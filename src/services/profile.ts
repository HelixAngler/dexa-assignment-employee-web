import { apiFetch, ApiError } from './api';
import { IDENTITY_BASE, type Profile } from './auth';

/** Where a photo may be pushed and which key names it in storage. */
export interface PhotoUploadTarget {
  presignedUrl: string;
  objectKey: string;
}

/**
 * Reads the signed-in employee's own profile. Absent fields are normalised to
 * empty values (and a missing photo to `null`) so every screen can render the
 * result without guarding against partial payloads.
 */
export async function fetchProfile(): Promise<Profile> {
  const data = await apiFetch<Partial<Profile>>(`${IDENTITY_BASE}/profile`);
  return {
    name: data.name ?? '',
    email: data.email ?? '',
    position: data.position ?? '',
    phone: data.phone ?? '',
    photoUrl: data.photoUrl ?? null,
  };
}

/**
 * Saves a new phone number. The server re-validates it (allowed characters
 * and a minimum digit count) and rejects an invalid value with a typed
 * `PHONE_INVALID` error carrying the human explanation to show inline.
 */
export function updatePhone(phone: string): Promise<null> {
  return apiFetch<null>(`${IDENTITY_BASE}/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ phone }),
  });
}

/**
 * Asks the server for a one-shot upload target. The server validates the
 * declared type and size first, so a rejected file never receives a URL;
 * failures arrive as `PHOTO_TYPE` / `PHOTO_TOO_LARGE` errors.
 */
export function requestPhotoUpload(
  contentType: string,
  sizeBytes: number,
): Promise<PhotoUploadTarget> {
  return apiFetch<PhotoUploadTarget>(`${IDENTITY_BASE}/profile/photo/upload-url`, {
    method: 'POST',
    body: JSON.stringify({ contentType, sizeBytes }),
  });
}

/**
 * Publishes an already-uploaded object as the new profile photo. Only this
 * commit replaces the previous photo, so an abandoned upload changes nothing.
 */
export function commitPhoto(objectKey: string): Promise<null> {
  return apiFetch<null>(`${IDENTITY_BASE}/profile/photo/commit`, {
    method: 'POST',
    body: JSON.stringify({ objectKey }),
  });
}

/**
 * Pushes the file bytes straight to the presigned URL. The request is made
 * outside the session client on purpose: the URL carries its own signature,
 * so no cookie, language header or other session material is attached.
 */
export async function putPhotoBytes(
  presignedUrl: string,
  contentType: string,
  bytes: Blob,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      credentials: 'omit',
      body: bytes,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'The upload could not reach the server.');
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      `HTTP_${response.status}`,
      'The storage server rejected the upload.',
    );
  }
}

/**
 * Changes the signed-in user's password. The current password is mandatory;
 * a weak replacement is rejected with `PASSWORD_WEAK` and a wrong current
 * password with `AUTH_INVALID`, both carrying the human explanation.
 */
export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<null> {
  return apiFetch<null>(`${IDENTITY_BASE}/auth/password/change`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
