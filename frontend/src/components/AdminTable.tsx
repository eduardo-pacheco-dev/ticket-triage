import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from '@carbon/react';

export interface AdminColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  value?: (row: T) => string;
}

interface AdminTableProps<T> {
  title?: string;
  description?: string;
  columns: AdminColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  searchFields?: (row: T) => string[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  toolbarExtra?: ReactNode;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function AdminTable<T>({
  title = 'Registros',
  description,
  columns,
  rows,
  getRowKey,
  searchFields,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum registro.',
  toolbarExtra,
}: AdminTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    if (!searchFields || !query.trim()) return rows;
    const terms = normalize(query.trim());
    return rows.filter((row) =>
      searchFields(row).some((field) => normalize(String(field ?? '')).includes(terms)),
    );
  }, [rows, query, searchFields]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const va = column.sortValue!(a);
      const vb = column.sortValue!(b);
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortAsc, columns]);

  function toggleSort(column: AdminColumn<T>) {
    if (!column.sortable) return;
    if (sortKey === column.key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(column.key);
      setSortAsc(true);
    }
  }

  const searchedOut = rows.length > 0 && sorted.length === 0;

  return (
    <TableContainer title={title} description={description}>
      <TableToolbar>
        <TableToolbarContent>
          {searchFields && (
            <TableToolbarSearch
              placeholder={searchPlaceholder}
              onChange={(e) => setQuery(e === '' ? '' : e.target.value)}
              persistent
            />
          )}
          {toolbarExtra}
        </TableToolbarContent>
      </TableToolbar>
      <Table size="lg">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableHeader
                key={column.key}
                isSortable={!!column.sortable}
                sortDirection={sortKey === column.key ? (sortAsc ? 'ASC' : 'DESC') : 'NONE'}
                onClick={() => toggleSort(column)}
              >
                {column.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render
                    ? column.render(row)
                    : (column.value?.(row) ??
                      String((row as Record<string, unknown>)[column.key] ?? ''))}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {(sorted.length === 0 || searchedOut) && (
            <TableRow>
              <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                {searchedOut ? 'Nenhum resultado para a busca.' : emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
