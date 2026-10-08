import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  changePassword,
  commitPhoto,
  fetchProfile,
  putPhotoBytes,
  requestPhotoUpload,
  updatePhone,
} from './profile';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('profile service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('fetchProfile', () => {
    it('reads the signed-in profile from the identity API', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Dewi Lestari',
          email: 'dewi@corp.test',
          position: 'Engineer',
          phone: '0812000000',
          photoUrl: '/api/identity/profile/photo',
        }),
      );

      const profile = await fetchProfile();

      expect(profile).toEqual({
        name: 'Dewi Lestari',
        email: 'dewi@corp.test',
        position: 'Engineer',
        phone: '0812000000',
        photoUrl: '/api/identity/profile/photo',
      });
      expect(String(fetchMock.mock.calls[0][0])).toBe('/api/identity/profile');
    });

    it('sends the session cookie and the active language with the request', async () => {
      window.localStorage.setItem('lang', 'en');
      fetchMock.mockResolvedValue(jsonResponse({}));

      await fetchProfile();

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.credentials).toBe('include');
      expect(new Headers(init.headers).get('Accept-Language')).toBe('en');
    });

    it('fills in absent fields so callers always render plain values', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ name: 'Only Name' }));

      await expect(fetchProfile()).resolves.toEqual({
        name: 'Only Name',
        email: '',
        position: '',
        phone: '',
        photoUrl: null,
      });
    });
  });

  describe('updatePhone', () => {
    it('patches the profile with the new phone number as JSON', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));

      await updatePhone('0812-3456-7890');

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/profile');
      expect(init.method).toBe('PATCH');
      expect(init.body).toBe(JSON.stringify({ phone: '0812-3456-7890' }));
      expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
      expect(init.credentials).toBe('include');
    });

    it('rejects with the PHONE_INVALID details of a rejected number', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 400,
            code: 'PHONE_INVALID',
            message: 'Nomor telepon tidak valid.',
          },
          400,
        ),
      );

      await expect(updatePhone('123')).rejects.toMatchObject({
        status: 400,
        code: 'PHONE_INVALID',
        message: 'Nomor telepon tidak valid.',
      });
    });
  });

  describe('requestPhotoUpload', () => {
    it('posts the content type and byte size to the upload-url endpoint', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          presignedUrl: 'https://storage.test/bucket/me.jpg',
          objectKey: 'photos/me.jpg',
        }),
      );

      await expect(requestPhotoUpload('image/png', 2048)).resolves.toEqual({
        presignedUrl: 'https://storage.test/bucket/me.jpg',
        objectKey: 'photos/me.jpg',
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/profile/photo/upload-url');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ contentType: 'image/png', sizeBytes: 2048 }));
    });

    it('propagates the PHOTO_TYPE and PHOTO_TOO_LARGE rejections', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { statusCode: 400, code: 'PHOTO_TOO_LARGE', message: 'Maksimal 2 MB.' },
          400,
        ),
      );

      await expect(requestPhotoUpload('image/jpeg', 3_000_000)).rejects.toMatchObject({
        status: 400,
        code: 'PHOTO_TOO_LARGE',
      });

      fetchMock.mockResolvedValue(
        jsonResponse(
          { statusCode: 400, code: 'PHOTO_TYPE', message: 'Hanya JPG atau PNG.' },
          400,
        ),
      );

      await expect(requestPhotoUpload('image/gif', 10)).rejects.toMatchObject({
        status: 400,
        code: 'PHOTO_TYPE',
      });
    });
  });

  describe('commitPhoto', () => {
    it('posts the object key to the commit endpoint', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));

      await commitPhoto('photos/me.jpg');

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/profile/photo/commit');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ objectKey: 'photos/me.jpg' }));
    });
  });

  describe('putPhotoBytes', () => {
    it('PUTs the bytes straight to the presigned URL with no session headers', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
      const bytes = new File(['photo'], 'me.jpg', { type: 'image/jpeg' });

      await putPhotoBytes('https://storage.test/bucket/me.jpg', 'image/jpeg', bytes);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://storage.test/bucket/me.jpg');
      expect(init.method).toBe('PUT');
      expect(init.body).toBe(bytes);
      expect(init.credentials).toBe('omit');
      const headers = new Headers(init.headers);
      expect(headers.get('Content-Type')).toBe('image/jpeg');
      expect(headers.get('Authorization')).toBeNull();
      expect(headers.get('Accept-Language')).toBeNull();
    });

    it('rejects when the storage server refuses the bytes', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 403 }));

      await expect(
        putPhotoBytes('https://storage.test/bucket/me.jpg', 'image/jpeg', new File(['x'], 'a.jpg', { type: 'image/jpeg' })),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('maps a transport failure to a network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(
        putPhotoBytes('https://storage.test/bucket/me.jpg', 'image/jpeg', new File(['x'], 'a.jpg', { type: 'image/jpeg' })),
      ).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    });
  });

  describe('changePassword', () => {
    it('posts the current and the new password to the change endpoint', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));

      await changePassword('old-secret-1', 'brand-new-pass');

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/auth/password/change');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(
        JSON.stringify({
          currentPassword: 'old-secret-1',
          newPassword: 'brand-new-pass',
        }),
      );
      expect(init.credentials).toBe('include');
    });

    it('propagates the PASSWORD_WEAK and AUTH_INVALID rejections', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 400,
            code: 'PASSWORD_WEAK',
            message: 'Kata sandi terlalu umum.',
          },
          400,
        ),
      );

      await expect(changePassword('old-secret-1', 'password')).rejects.toMatchObject({
        status: 400,
        code: 'PASSWORD_WEAK',
      });

      fetchMock.mockResolvedValue(
        jsonResponse(
          { statusCode: 401, code: 'AUTH_INVALID', message: 'Kata sandi saat ini salah.' },
          401,
        ),
      );

      await expect(changePassword('wrong-one', 'brand-new-pass')).rejects.toMatchObject({
        status: 401,
        code: 'AUTH_INVALID',
      });
    });
  });
});
