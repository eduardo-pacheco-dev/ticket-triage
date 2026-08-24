import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

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
    <TableContainer component={Paper} variant="outlined">
      {(searchFields || toolbarExtra) && (
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1.5, gap: 2, flexWrap: 'wrap' }}>
          <Stack sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" fontSize="1rem" fontWeight={600}>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Stack>
          {searchFields && (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ width: { xs: '100%', sm: 300 } }}
            />
          )}
          {toolbarExtra}
        </Toolbar>
      )}
      <Table size="medium">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                sortDirection={sortKey === column.key ? (sortAsc ? 'asc' : 'desc') : false}
              >
                {column.sortable ? (
                  <TableSortLabel
                    active={sortKey === column.key}
                    direction={sortKey === column.key && !sortAsc ? 'desc' : 'asc'}
                    onClick={() => toggleSort(column)}
                  >
                    {column.header}
                  </TableSortLabel>
                ) : (
                  column.header
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={getRowKey(row)} hover>
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
              <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                <Box>{searchedOut ? 'Nenhum resultado para a busca.' : emptyMessage}</Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
