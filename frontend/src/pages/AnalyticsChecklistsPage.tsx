import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import ArrowLeftIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import {
  fetchAnalyticsChecklists,
  fetchImportJob,
  uploadAnalyticsExcel,
  deleteAllAnalyticsChecklists,
  downloadAnalyticsExcel,
  ApiError,
} from '../lib/api';
import { useToastStore } from '../stores/toast';
import type { AnalyticsChecklist, AnalyticsChecklistStatus, ImportJob } from '../lib/types';
import { analyticsChecklistStatusLabel } from '../lib/types';

type SortKey = 'project' | 'siteId' | 'smpName' | 'module' | 'status' | 'section' | 'createdAt';

function getStatusColor(status: string): 'success' | 'error' | 'warning' | 'info' | 'default' {
  const s = status.toLowerCase();
  if (s.includes('aprovado') || s.includes('approved')) return 'success';
  if (s.includes('rejeitado') || s.includes('rejected') || s.includes('reprovado')) return 'error';
  if (s.includes('andamento') || s.includes('progress') || s.includes('em análise')) return 'info';
  if (s.includes('pendente') || s.includes('pending')) return 'warning';
  return 'default';
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

export default function AnalyticsChecklistsPage() {
  const notify = useToastStore((s) => s.notify);
  const [items, setItems] = useState<AnalyticsChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AnalyticsChecklistStatus | ''>('');

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [uploading, setUploading] = useState(false);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setItems(await fetchAnalyticsChecklists());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar analytics.');
    }
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const job = await uploadAnalyticsExcel(file);
      setActiveJob(job);
      pollJob(job.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erro ao importar planilha.');
      }
      setUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function pollJob(jobId: string) {
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let attempts = 0;
    const maxAttempts = 600;

    while (attempts < maxAttempts) {
      await delay(attempts < 10 ? 500 : 2000);
      attempts++;
      try {
        const job = await fetchImportJob(jobId);
        setActiveJob(job);
        if (job.status === 'completed' || job.status === 'failed') {
          setUploading(false);
          if (job.status === 'completed') {
            notify({
              kind: job.errors > 0 ? 'warning' : 'success',
              title:
                job.errors > 0
                  ? `${job.processed - job.errors} registros importados, ${job.errors} erros.`
                  : `${job.processed} registros importados com sucesso.`,
            });
          } else {
            notify({ kind: 'error', title: 'Falha na importação.' });
          }
          await reload();
          return;
        }
      } catch {
        break;
      }
    }
    setUploading(false);
    setError('Tempo limite de processamento excedido.');
  }

  async function handleClearAll() {
    setError(null);
    try {
      await deleteAllAnalyticsChecklists();
      notify({ kind: 'success', title: 'Todos os registros foram removidos.' });
      setPendingClear(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao limpar registros.');
      setPendingClear(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function clearFilters() {
    setSearchTerm('');
    setStatusFilter('');
    setPage(0);
  }

  const filteredAndSortedRows = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();

    const filtered = items.filter((item) => {
      if (searchTerm) {
        const matchesSearch =
          item.project.toLowerCase().includes(searchLower) ||
          (item.siteId && item.siteId.toLowerCase().includes(searchLower)) ||
          (item.smpName && item.smpName.toLowerCase().includes(searchLower)) ||
          (item.module && item.module.toLowerCase().includes(searchLower)) ||
          (item.section && item.section.toLowerCase().includes(searchLower)) ||
          (item.checklistItem && item.checklistItem.toLowerCase().includes(searchLower)) ||
          (item.modifiedBy && item.modifiedBy.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      if (statusFilter && item.status !== statusFilter) return false;

      return true;
    });

    return [...filtered]
      .map((item) => ({
        ...item,
        createdAtValue: new Date(item.createdAt).getTime(),
      }))
      .sort((a, b) => {
        let va: string | number;
        let vb: string | number;
        if (sortKey === 'createdAt') {
          va = a.createdAtValue;
          vb = b.createdAtValue;
        } else {
          va = String(a[sortKey] ?? '');
          vb = String(b[sortKey] ?? '');
        }
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [items, searchTerm, statusFilter, sortKey, sortAsc]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredAndSortedRows.slice(start, start + rowsPerPage);
  }, [filteredAndSortedRows, page, rowsPerPage]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].sort();
  }, [items]);

  const hasActiveFilters = searchTerm || statusFilter;

  return (
    <div className="admin-page">
      <div style={{ marginBottom: '1rem' }}>
        <Button component={Link} to="/admin" startIcon={<ArrowLeftIcon />} size="small">
          Voltar para a fila
        </Button>
      </div>

      <h1 className="admin-title">Analytics</h1>
      <p className="admin-subtitle" style={{ marginBottom: '1.5rem' }}>
        Importe e visualize dados de checklist de implementação via planilha Excel.
      </p>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={handleFileChange}
        />
        <Button
          variant="contained"
          startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Importando...' : 'Importar Excel'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={items.length === 0}
          onClick={() => setPendingClear(true)}
        >
          Limpar dados
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={items.length === 0}
          onClick={downloadAnalyticsExcel}
        >
          Exportar Excel
        </Button>
      </Stack>

      {activeJob && (activeJob.status === 'pending' || activeJob.status === 'processing') && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight={600}>
                Importando dados...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeJob.processed} / {activeJob.total} (
                {activeJob.total > 0
                  ? Math.round((activeJob.processed / activeJob.total) * 100)
                  : 0}
                %)
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={activeJob.total > 0 ? (activeJob.processed / activeJob.total) * 100 : 0}
              color={activeJob.errors > 0 ? 'warning' : 'primary'}
            />
            {activeJob.errors > 0 && (
              <Typography variant="body2" color="warning.main">
                {activeJob.errors} erro(s) encontrado(s)
              </Typography>
            )}
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            placeholder="Buscar por projeto, site, módulo, seção..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ flexGrow: 1, minWidth: 250 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchTerm('');
                        setPage(0);
                      }}
                      title="Limpar busca"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as AnalyticsChecklistStatus | '');
              setPage(0);
            }}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {uniqueStatuses.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          {hasActiveFilters && (
            <Button size="small" onClick={clearFilters} startIcon={<ClearIcon />}>
              Limpar
            </Button>
          )}
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 200 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
            <Stack>
              <Typography variant="h6" component="div" fontSize="1rem" fontWeight={600}>
                Registros importados
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredAndSortedRows.length} de {items.length} registro(s)
              </Typography>
            </Stack>
          </Toolbar>
          <Table size="small">
            <TableHead>
              <TableRow>
                {(
                  [
                    ['project', 'Project'],
                    ['siteId', 'Site ID'],
                    ['smpName', 'SMP Name'],
                    ['module', 'Módulo'],
                    ['section', 'Seção'],
                    ['status', 'Status'],
                    ['createdAt', 'Criado em'],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <TableCell
                    key={key}
                    sortDirection={sortKey === key ? (sortAsc ? 'asc' : 'desc') : false}
                  >
                    <TableSortLabel
                      active={sortKey === key}
                      direction={sortKey === key && !sortAsc ? 'desc' : 'asc'}
                      onClick={() => toggleSort(key)}
                    >
                      {label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {hasActiveFilters
                        ? 'Nenhum registro encontrado com os filtros aplicados.'
                        : 'Nenhum registro importado. Use o botão "Importar Excel" para carregar dados.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.project}
                    </TableCell>
                    <TableCell>{row.siteId ?? '-'}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.smpName ?? '-'}
                    </TableCell>
                    <TableCell>{row.module ?? '-'}</TableCell>
                    <TableCell>{row.section ?? '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={getStatusColor(row.status)}
                        label={analyticsChecklistStatusLabel(row.status)}
                      />
                    </TableCell>
                    <TableCell>{new Date(row.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filteredAndSortedRows.length > 0 && (
            <TablePagination
              component="div"
              count={filteredAndSortedRows.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          )}
        </TableContainer>
      )}

      <Dialog open={pendingClear} onClose={() => setPendingClear(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Limpar dados de analytics</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover <strong>todos</strong> os registros de analytics
            importados? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingClear(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => void handleClearAll()}>
            Limpar tudo
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
