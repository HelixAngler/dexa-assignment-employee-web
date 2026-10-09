import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import SuccessToast from '../../src/components/states/SuccessToast';
import { I18nProvider } from '../../src/i18n/provider';

const MESSAGE = 'Perubahan berhasil disimpan.';

function renderToast(message = MESSAGE) {
  return render(
    <I18nProvider>
      <SuccessToast message={message} />
    </I18nProvider>,
  );
}

describe('success toast announcement', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('exposes the toast through role="status"', () => {
    renderToast();

    const region = screen.getByRole('status');

    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveTextContent(MESSAGE);
  });

  it('announces the toast in exactly one status region', () => {
    renderToast();

    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});
