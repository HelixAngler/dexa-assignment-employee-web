import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPunchState, fetchSummary, punch } from './attendance';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('attendance service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the punch state from the state endpoint', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 'bekerja',
        clockInAt: '2026-10-07T01:00:00.000Z',
        lastPunch: { direction: 'masuk', at: '2026-10-07T01:00:00.000Z' },
      }),
    );

    await expect(fetchPunchState()).resolves.toEqual({
      status: 'bekerja',
      clockInAt: '2026-10-07T01:00:00.000Z',
      lastPunch: { direction: 'masuk', at: '2026-10-07T01:00:00.000Z' },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/attendance/punches/state');
    expect(init.method ?? 'GET').toBe('GET');
    expect((init as RequestInit).credentials).toBe('include');
  });

  it('posts the direction together with the caller idempotency key', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        sessionId: 's-1',
        direction: 'masuk',
        at: '2026-10-07T01:00:00.000Z',
      }),
    );

    await punch('masuk', 'key-123');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/attendance/punches');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ direction: 'masuk' }));
    expect(new Headers(init.headers).get('Idempotency-Key')).toBe('key-123');
  });

  it('surfaces a refused punch as a typed conflict error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 409,
          code: 'SESSION_ALREADY_OPEN',
          message: 'Anda sudah absen masuk.',
        },
        409,
      ),
    );

    await expect(punch('masuk', 'key-123')).rejects.toMatchObject({
      status: 409,
      code: 'SESSION_ALREADY_OPEN',
    });
  });

  it('reports a transport failure as a status-0 error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(punch('masuk', 'key-123')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('reads the summary without query parameters so the server applies its default range', async () => {
    const body = {
      rows: [
        {
          date: '2026-10-01',
          masuk: '2026-10-01T01:00:00.000Z',
          pulang: '2026-10-01T10:00:00.000Z',
        },
      ],
    };
    fetchMock.mockResolvedValue(jsonResponse(body));

    await expect(fetchSummary()).resolves.toEqual(body);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/attendance/summary');
    expect(init.method ?? 'GET').toBe('GET');
    expect(init.credentials).toBe('include');
  });

  it('passes an explicit From–To range as query parameters', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ rows: [] }));

    await fetchSummary({ from: '2026-10-01', to: '2026-10-07' });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('/api/attendance/summary?from=2026-10-01&to=2026-10-07');
  });

  it('surfaces a rejected range as a typed 400 error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { statusCode: 400, code: 'RANGE_INVALID', message: 'from after to' },
        400,
      ),
    );

    await expect(
      fetchSummary({ from: '2026-10-08', to: '2026-10-01' }),
    ).rejects.toMatchObject({ status: 400, code: 'RANGE_INVALID' });
  });
});
