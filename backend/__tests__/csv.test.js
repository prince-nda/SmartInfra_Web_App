const { toCsv } = require('../utils/csv');

describe('toCsv', () => {
  const columns = [
    { label: 'ID', value: 'id' },
    { label: 'Name', value: 'name' },
  ];

  it('produces a header row followed by one row per record', () => {
    const rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const csv = toCsv(rows, columns);
    const lines = csv.split('\r\n');
    expect(lines).toEqual(['ID,Name', '1,Alice', '2,Bob']);
  });

  it('escapes values containing commas by quoting them', () => {
    const rows = [{ id: 1, name: 'Smith, Jane' }];
    const csv = toCsv(rows, columns);
    expect(csv).toContain('"Smith, Jane"');
  });

  it('escapes embedded quotes by doubling them', () => {
    const rows = [{ id: 1, name: 'The "Best" Report' }];
    const csv = toCsv(rows, columns);
    expect(csv).toContain('"The ""Best"" Report"');
  });

  it('treats null/undefined values as empty strings, not the literal text "null"', () => {
    const rows = [{ id: 1, name: null }];
    const csv = toCsv(rows, columns);
    expect(csv.split('\r\n')[1]).toBe('1,');
  });

  it('supports a function as a column value for computed fields', () => {
    const rows = [{ id: 1, first: 'Jane', last: 'Doe' }];
    const computedColumns = [
      { label: 'Full name', value: (r) => `${r.first} ${r.last}` },
    ];
    const csv = toCsv(rows, computedColumns);
    expect(csv.split('\r\n')[1]).toBe('Jane Doe');
  });

  it('returns just a header row when there are no records', () => {
    const csv = toCsv([], columns);
    expect(csv).toBe('ID,Name');
  });
});