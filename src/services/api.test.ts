import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiFetch', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the cookie credentials and the active language on every call', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch('/api/identity/profile');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/identity/profile');
    expect(init.credentials).toBe('include');
    const headers = new Headers(init.headers);
    expect(headers.get('Accept-Language')).toBe('id');
    expect(headers.get('Content-Type')).toBeNull();
  });

  it('reports the stored English preference through Accept-Language', async () => {
    window.localStorage.setItem('lang', 'en');
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch('/api/identity/profile');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('Accept-Language')).toBe('en');
  });

  it('serialises a JSON body and marks its content type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ role: 'employee' }));

    await apiFetch('/api/identity/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.c' }),
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe('{"email":"a@b.c"}');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('returns the parsed body of a successful response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'bekerja' }));

    await expect(apiFetch<{ status: string }>('/api/attendance/punches/state')).resolves.toEqual({
      status: 'bekerja',
    });
  });

  it('resolves with nothing for a 204 without a body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch('/api/identity/auth/logout')).resolves.toBeNull();
  });

  it('maps a 401 error body onto a typed ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 401,
          code: 'AUTH_INVALID',
          message: 'Email atau kata sandi salah.',
          attemptsRemaining: 3,
        },
        401,
      ),
    );

    const failure = apiFetch('/api/identity/auth/login', { method: 'POST' });

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_INVALID',
      message: 'Email atau kata sandi salah.',
      attemptsRemaining: 3,
    });
  });

  it('keeps ApiError fields empty when the body carries no machine code', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 418 }));

    await expect(apiFetch('/api/identity/profile')).rejects.toMatchObject({
      status: 418,
      code: 'HTTP_418',
      attemptsRemaining: undefined,
    });
  });

  it('turns a failed fetch into a status-0 network ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiFetch('/api/attendance/punches/state')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
