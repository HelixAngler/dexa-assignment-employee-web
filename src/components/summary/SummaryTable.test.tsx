import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { id } from '../../i18n/id';
import { I18nProvider } from '../../i18n/provider';
import SummaryTable, { type SummaryDisplayRow } from './SummaryTable';

const rows: SummaryDisplayRow[] = [
  {
    date: '2026-10-05',
    masuk: '2026-10-05T01:00:00.000Z',
    pulang: '2026-10-05T10:00:00.000Z',
  },
  {
    date: '2026-10-06',
    masuk: '2026-10-06T01:00:00.000Z',
    pulang: null,
    open: true,
  },
  {
    date: '2026-10-07',
    masuk: '2026-10-07T01:00:00.000Z',
    pulang: '2026-10-07T09:00:00.000Z',
    systemClosed: true,
  },
  { date: '2026-10-08', masuk: null, pulang: null, noData: true },
];

function renderTable(props: Partial<Parameters<typeof SummaryTable>[0]> = {}) {
  return render(
    <I18nProvider>
      <SummaryTable rows={rows} {...props} />
    </I18nProvider>,
  );
}

/** The desktop row and the phone card that both carry the given date. */
function entriesFor(date: string) {
  const tableEntry = screen
    .getByTestId('summary-table')
    .querySelector(`[data-date="${date}"]`);
  const cardEntry = screen
    .getByTestId('summary-cards')
    .querySelector(`[data-date="${date}"]`);
  if (tableEntry === null || cardEntry === null) {
    throw new Error(`no summary entry for ${date}`);
  }
  return { table: tableEntry as HTMLElement, card: cardEntry as HTMLElement };
}

describe('SummaryTable', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps a desktop table of the three summary columns with tabular figures', () => {
    renderTable();

    const table = screen.getByTestId('summary-table');
    expect(table.className).toContain('hidden');
    expect(table.className).toContain('md:table');
    expect(table.className).toContain('tabular-nums');
    expect(
      within(table).getByRole('columnheader', { name: id['summary.table.date'] }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: id['summary.table.masuk'] }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: id['summary.table.pulang'] }),
    ).toBeInTheDocument();

    expect(within(table).getAllByTestId('summary-row')).toHaveLength(rows.length);

    const { table: first } = entriesFor('2026-10-05');
    expect(first).toHaveTextContent('2026-10-05');
    expect(within(first).getByTestId('summary-masuk')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );
    expect(within(first).getByTestId('summary-pulang')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );
  });

  it('stacks one card per date for the phone layout', () => {
    renderTable();

    const cards = screen.getByTestId('summary-cards');
    expect(cards.className).toContain('md:hidden');
    expect(cards.querySelectorAll('[data-testid="summary-card"]')).toHaveLength(
      rows.length,
    );

    const { card } = entriesFor('2026-10-05');
    expect(card.tagName).toBe('LI');
    expect(card).toHaveTextContent('2026-10-05');
    expect(card).toHaveTextContent(id['summary.table.masuk']);
    expect(card).toHaveTextContent(id['summary.table.pulang']);
    expect(within(card).getByTestId('summary-masuk')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );
  });

  it('marks a still-open session and a system-closed session distinctly', () => {
    renderTable();

    const { table: openRow, card: openCard } = entriesFor('2026-10-06');
    expect(openRow).toHaveTextContent(id['summary.row.stillWorking']);
    expect(openRow).not.toHaveTextContent(id['summary.row.systemClosed']);
    expect(within(openRow).getByTestId('summary-still-working')).toBeInTheDocument();
    expect(within(openCard).getByTestId('summary-still-working')).toBeInTheDocument();

    const { table: closedRow, card: closedCard } = entriesFor('2026-10-07');
    expect(closedRow).toHaveTextContent(id['summary.row.systemClosed']);
    expect(within(closedRow).getByTestId('summary-pulang')).toHaveTextContent(
      /^\d{2}[.:]\d{2}$/,
    );
    expect(within(closedRow).getByTestId('summary-system-closed')).toBeInTheDocument();
    expect(within(closedCard).getByTestId('summary-system-closed')).toBeInTheDocument();
  });

  it('shows an explicit no-data marker for a date without a session', () => {
    renderTable();

    const { table, card } = entriesFor('2026-10-08');
    expect(table).toHaveTextContent(id['summary.row.noData']);
    expect(card).toHaveTextContent(id['summary.row.noData']);
    expect(within(card).getByTestId('summary-no-data')).toBeInTheDocument();
    expect(screen.getAllByTestId('summary-no-data')).toHaveLength(2);
    expect(within(table).queryByTestId('summary-masuk')).not.toBeInTheDocument();
  });

  it('delegates an empty row list to the empty state with the caller copy', () => {
    renderTable({
      rows: [],
      emptyTitle: 'Judul kosong',
      emptyDescription: 'Deskripsi kosong.',
    });

    const empty = screen.getByTestId('empty-state');
    expect(empty).toHaveTextContent('Judul kosong');
    expect(empty).toHaveTextContent('Deskripsi kosong.');
    expect(screen.queryByTestId('summary-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('summary-cards')).not.toBeInTheDocument();
  });

  it('renders the English copy when English is the stored language', () => {
    window.localStorage.setItem('lang', 'en');
    renderTable();

    const table = screen.getByTestId('summary-table');
    expect(
      within(table).getByRole('columnheader', { name: 'Date' }),
    ).toBeInTheDocument();
    expect(entriesFor('2026-10-06').table).toHaveTextContent('(still working)');
    expect(entriesFor('2026-10-08').card).toHaveTextContent('no data');
  });
});
