import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import ChangePhotoPage from './ChangePhotoPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const PRESIGNED_URL = 'https://storage.test/bucket/me.jpg';

function LocationProbe() {
  const location = useLocation();
  return (
    <div>
      <span data-testid="location-path">{location.pathname}</span>
      <span data-testid="location-state">{JSON.stringify(location.state ?? null)}</span>
    </div>
  );
}

function renderPhoto() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/profil/foto']}>
        <LocationProbe />
        <ChangePhotoPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('ChangePhotoPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Serves the whole happy chain: upload-url → presigned PUT → commit. */
  function mockHappyUpload(uploadUrlResponse?: () => Promise<Response>) {
    fetchMock.mockImplementation((url: string) => {
      const target = String(url);
      if (target.startsWith('https://storage.test/')) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      if (target.endsWith('/photo/upload-url')) {
        return uploadUrlResponse
          ? uploadUrlResponse()
          : Promise.resolve(
              jsonResponse({ presignedUrl: PRESIGNED_URL, objectKey: 'photos/me.jpg' }),
            );
      }
      if (target.endsWith('/photo/commit')) {
        return Promise.resolve(jsonResponse({}));
      }
      return Promise.resolve(jsonResponse({}));
    });
  }

  function requestUrls() {
    return fetchMock.mock.calls.map(([url]) => String(url));
  }

  function expectPath(path: string) {
    expect(screen.getByTestId('location-path')).toHaveTextContent(
      new RegExp(`^${path}$`),
    );
  }

  it('states the format and size rules before the file picker', () => {
    renderPhoto();

    const rules = screen.getByTestId('photo-rules');
    expect(rules).toHaveTextContent(id['profile.photo.hint']);
    const input = screen.getByTestId('photo-input');
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png');
    expect(
      rules.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('rejects an oversized file inline without contacting the server', async () => {
    const user = userEvent.setup();
    renderPhoto();

    const oversized = new File(
      [new Uint8Array(2 * 1024 * 1024 + 1)],
      'huge.jpg',
      { type: 'image/jpeg' },
    );
    await user.upload(screen.getByTestId('photo-input'), oversized);

    expect(await screen.findByTestId('photo-error')).toHaveTextContent(
      id['profile.photo.error.size'],
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expectPath('/profil/foto');
  });

  it('rejects an unsupported file type inline without contacting the server', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderPhoto();

    const gif = new File(['animation'], 'anim.gif', { type: 'image/gif' });
    await user.upload(screen.getByTestId('photo-input'), gif);

    expect(await screen.findByTestId('photo-error')).toHaveTextContent(
      id['profile.photo.error.type'],
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expectPath('/profil/foto');
  });

  it('uploads the picked file end to end and returns to Profil', async () => {
    const user = userEvent.setup();
    mockHappyUpload();
    renderPhoto();

    const photo = new File(['photo-bytes'], 'me.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('photo-input'), photo);

    await waitFor(() => expectPath('/profil'));
    expect(screen.getByTestId('location-state')).toHaveTextContent('"flash":"photo"');

    expect(requestUrls()).toEqual([
      '/api/identity/profile/photo/upload-url',
      PRESIGNED_URL,
      '/api/identity/profile/photo/commit',
    ]);

    const [uploadCall, putCall, commitCall] = fetchMock.mock.calls;
    const uploadInit = uploadCall[1] as RequestInit;
    const putInit = putCall[1] as RequestInit;
    const commitInit = commitCall[1] as RequestInit;
    expect(JSON.parse(uploadInit.body as string)).toEqual({
      contentType: 'image/jpeg',
      sizeBytes: photo.size,
    });
    expect(putInit.method).toBe('PUT');
    expect(putInit.body).toBe(photo);
    expect(new Headers(putInit.headers).get('Authorization')).toBeNull();
    expect(JSON.parse(commitInit.body as string)).toEqual({
      objectKey: 'photos/me.jpg',
    });
  });

  it('shows the server PHOTO_TOO_LARGE message inline and stays on the page', async () => {
    const user = userEvent.setup();
    mockHappyUpload(() =>
      Promise.resolve(
        jsonResponse(
          {
            statusCode: 400,
            code: 'PHOTO_TOO_LARGE',
            message: 'Foto terlalu besar untuk diunggah.',
          },
          400,
        ),
      ),
    );
    renderPhoto();

    const photo = new File(['photo-bytes'], 'me.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('photo-input'), photo);

    expect(await screen.findByTestId('photo-error')).toHaveTextContent(
      'Foto terlalu besar untuk diunggah.',
    );
    expectPath('/profil/foto');
    expect(requestUrls()).toEqual(['/api/identity/profile/photo/upload-url']);
  });

  it('falls back to the local type copy when PHOTO_TYPE arrives without a message', async () => {
    const user = userEvent.setup();
    mockHappyUpload(() =>
      Promise.resolve(
        jsonResponse({ statusCode: 400, code: 'PHOTO_TYPE', message: '' }, 400),
      ),
    );
    renderPhoto();

    const photo = new File(['photo-bytes'], 'me.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('photo-input'), photo);

    expect(await screen.findByTestId('photo-error')).toHaveTextContent(
      id['profile.photo.error.type'],
    );
    expectPath('/profil/foto');
  });

  it('reports the connection copy when the upload cannot reach the server', async () => {
    const user = userEvent.setup();
    mockHappyUpload(() => Promise.reject(new TypeError('Failed to fetch')));
    renderPhoto();

    const photo = new File(['photo-bytes'], 'me.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('photo-input'), photo);

    expect(await screen.findByTestId('photo-error')).toHaveTextContent(
      id['auth.error.network'],
    );
    expectPath('/profil/foto');
  });

  it('cancels back to Profil without starting an upload', async () => {
    const user = userEvent.setup();
    mockHappyUpload();
    renderPhoto();

    await user.click(screen.getByRole('button', { name: id['common.cancel'] }));

    await waitFor(() => expectPath('/profil'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
