import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { fetchSession, login, logout, setFirstPassword } from './auth';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('auth service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('login', () => {
    it('posts the credentials and returns the role flags', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ role: 'employee', mustChangePassword: true }),
      );

      const result = await login('worker@corp.test', 'secret-1');

      expect(result).toEqual({ role: 'employee', mustChangePassword: true });
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/identity/auth/login');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(
        JSON.stringify({ email: 'worker@corp.test', password: 'secret-1' }),
      );
    });

    it('rejects with the status, code and attempts left of a 401', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 401,
            code: 'AUTH_INVALID',
            message: 'Email atau kata sandi salah.',
            attemptsRemaining: 4,
          },
          401,
        ),
      );

      const attempt = login('worker@corp.test', 'wrong');

      await expect(attempt).rejects.toBeInstanceOf(ApiError);
      await expect(attempt).rejects.toMatchObject({
        status: 401,
        code: 'AUTH_INVALID',
        attemptsRemaining: 4,
      });
    });

    it('propagates a 423 lockout as AUTH_LOCKED without attempts left', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 423,
            code: 'AUTH_LOCKED',
            message: 'Akun dikunci setelah terlalu banyak percobaan gagal.',
          },
          423,
        ),
      );

      await expect(login('worker@corp.test', 'wrong')).rejects.toMatchObject({
        status: 423,
        code: 'AUTH_LOCKED',
        attemptsRemaining: undefined,
      });
    });
  });

  describe('fetchSession', () => {
    it('resolves to null when the profile probe is rejected as unauthenticated', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ statusCode: 401, code: 'AUTH_REQUIRED', message: 'no' }, 401),
      );

      await expect(fetchSession()).resolves.toBeNull();
    });

    it('builds the session from the profile payload when it carries the flags', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Worker',
          email: 'worker@corp.test',
          position: 'Engineer',
          phone: '0812000000',
          photoUrl: null,
          role: 'employee',
          mustChangePassword: false,
        }),
      );

      await expect(fetchSession()).resolves.toEqual({
        name: 'Worker',
        email: 'worker@corp.test',
        position: 'Engineer',
        phone: '0812000000',
        photoUrl: null,
        role: 'employee',
        mustChangePassword: false,
      });
    });

    it('falls back to the flags remembered from the last login', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ role: 'hrd', mustChangePassword: true }));
      await login('admin@corp.test', 'secret-1');

      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Admin',
          email: 'admin@corp.test',
          position: 'HRD',
          phone: '0813000000',
          photoUrl: null,
        }),
      );

      await expect(fetchSession()).resolves.toMatchObject({
        role: 'hrd',
        mustChangePassword: true,
        name: 'Admin',
      });
    });

    it('bootstraps an unknown tab from the profile alone when nothing is remembered', async () => {
      // A fresh tab shares the session cookie but not the flags the sign-in
      // form wrote: the profile payload is the only thing it can ask, and an
      // HRD session in it must still be recognised here.
      expect(window.sessionStorage.getItem('session-meta')).toBeNull();
      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Admin',
          email: 'admin@corp.test',
          position: 'HRD',
          phone: '0812000000',
          photoUrl: null,
          role: 'hrd',
        }),
      );

      await expect(fetchSession()).resolves.toMatchObject({ role: 'hrd' });
      expect(window.sessionStorage.getItem('session-meta')).toBeNull();
    });

    it('prefers the role the profile reports over flags this tab remembered', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ role: 'hrd', mustChangePassword: false }),
      );
      await login('admin@corp.test', 'secret-1');

      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Admin',
          email: 'admin@corp.test',
          position: 'HRD',
          phone: '0812000000',
          photoUrl: null,
          role: 'employee',
        }),
      );

      await expect(fetchSession()).resolves.toMatchObject({ role: 'employee' });
    });

    it('rethrows a network failure instead of pretending the user is signed out', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(fetchSession()).rejects.toMatchObject({ status: 0 });
    });
  });

  describe('logout', () => {
    it('posts the logout request and forgets the remembered flags', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ role: 'employee', mustChangePassword: false }));
      await login('worker@corp.test', 'secret-1');

      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
      await logout();

      expect(fetchMock.mock.calls[1][0]).toBe('/api/identity/auth/logout');
      expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');

      fetchMock.mockResolvedValue(
        jsonResponse({ statusCode: 401, code: 'AUTH_REQUIRED', message: 'no' }, 401),
      );
      await expect(fetchSession()).resolves.toBeNull();
    });

    it('still ends the local session when the request fails', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ role: 'employee', mustChangePassword: true }));
      await login('worker@corp.test', 'secret-1');

      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(logout()).resolves.toBeUndefined();

      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Worker',
          email: 'worker@corp.test',
          position: 'Engineer',
          phone: '0812000000',
          photoUrl: null,
        }),
      );
      await expect(fetchSession()).resolves.toMatchObject({
        role: 'employee',
        mustChangePassword: false,
      });
    });
  });

  describe('setFirstPassword', () => {
    it('posts both password fields and clears the remembered change flag', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ role: 'employee', mustChangePassword: true }));
      await login('worker@corp.test', 'temp-password');

      fetchMock.mockResolvedValue(jsonResponse({}));
      await setFirstPassword('brand-new-pass', 'brand-new-pass');

      const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect(fetchMock.mock.calls[1][0]).toBe('/api/identity/auth/password/set-first');
      expect(secondInit.body).toBe(
        JSON.stringify({
          newPassword: 'brand-new-pass',
          confirmPassword: 'brand-new-pass',
        }),
      );

      fetchMock.mockResolvedValue(
        jsonResponse({
          name: 'Worker',
          email: 'worker@corp.test',
          position: 'Engineer',
          phone: '0812000000',
          photoUrl: null,
        }),
      );
      await expect(fetchSession()).resolves.toMatchObject({ mustChangePassword: false });
    });

    it('surfaces the server PASSWORD_WEAK message', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 400,
            code: 'PASSWORD_WEAK',
            message: 'Kata sandi tidak memenuhi persyaratan keamanan.',
          },
          400,
        ),
      );

      await expect(setFirstPassword('short', 'short')).rejects.toMatchObject({
        status: 400,
        code: 'PASSWORD_WEAK',
        message: 'Kata sandi tidak memenuhi persyaratan keamanan.',
      });
    });
  });
});
