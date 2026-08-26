import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import ArrowLeftIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/EditOutlined';
import TrashCanIcon from '@mui/icons-material/DeleteOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TableChartIcon from '@mui/icons-material/TableChartOutlined';
import MapIcon from '@mui/icons-material/MapOutlined';
import { createStation, deleteStation, fetchStations, updateStation, ApiError } from '../lib/api';
import { createStationSchema, updateStationSchema } from '@ticket-triage/shared';
import { zodFieldErrors } from '../lib/schemas';
import { useToastStore } from '../stores/toast';
import type { Station } from '../lib/types';

const StationMap = lazy(() => import('../components/StationMap'));

const BRAZIL_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

interface FormState {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  responsible: string;
  notes: string;
}

const emptyForm: FormState = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  phone: '',
  email: '',
  responsible: '',
  notes: '',
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

export default function StationsPage() {
  const notify = useToastStore((s) => s.notify);
  const [activeTab, setActiveTab] = useState('table');
  const [stations, setStations] = useState<Station[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const [editForm, setEditForm] = useState<(FormState & { id: string }) | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Station | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchStations({
        page: page + 1,
        pageSize: rowsPerPage,
        search: debouncedSearch || undefined,
        state: stateFilter || undefined,
      });
      setStations(result.items);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estações.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, stateFilter]);

  useEffect(() => {
    if (activeTab === 'table') {
      void reload();
    }
  }, [reload, activeTab]);

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 400);
  }

  function handleStateFilterChange(value: string) {
    setStateFilter(value);
    setPage(0);
  }

  function clearFilters() {
    setSearchTerm('');
    setDebouncedSearch('');
    setStateFilter('');
    setPage(0);
  }

  function openCreate() {
    setCreateForm(emptyForm);
    setCreateErrors({});
    setError(null);
    setCreateOpen(true);
  }

  function openEdit(station: Station) {
    setEditErrors({});
    setEditForm({
      id: station.id,
      name: station.name,
      code: station.code,
      address: station.address ?? '',
      city: station.city ?? '',
      state: station.state ?? '',
      phone: station.phone ?? '',
      email: station.email ?? '',
      responsible: station.responsible ?? '',
      notes: station.notes ?? '',
    });
  }

  async function handleCreate() {
    setError(null);
    const parsed = createStationSchema.safeParse(createForm);
    if (!parsed.success) {
      setCreateErrors(zodFieldErrors(parsed.error));
      return;
    }
    setCreating(true);
    try {
      await createStation(parsed.data);
      notify({ kind: 'success', title: `Estação "${parsed.data.name}" criada.` });
      setCreateOpen(false);
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setCreateErrors({ code: err.message });
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao criar estação.');
        setCreateOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    setError(null);
    const parsed = updateStationSchema.safeParse(editForm);
    if (!parsed.success) {
      setEditErrors(zodFieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      await updateStation(editForm.id, parsed.data);
      notify({ kind: 'success', title: 'Estação atualizada.' });
      setEditForm(null);
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setEditErrors({ code: err.message });
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao atualizar estação.');
        setEditForm(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setError(null);
    try {
      await deleteStation(pendingDelete.id);
      notify({ kind: 'success', title: `Estação "${pendingDelete.name}" removida.` });
      setPendingDelete(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover estação.');
      setPendingDelete(null);
    }
  }

  const hasActiveFilters = searchTerm || stateFilter;

  function renderFormFields(
    form: FormState,
    setForm: (f: FormState) => void,
    errors: Record<string, string>,
    prefix: string,
  ) {
    return (
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            id={`${prefix}_name`}
            label="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
          />
          <TextField
            id={`${prefix}_code`}
            label="Código (SITE ID)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            error={!!errors.code}
            helperText={errors.code}
            fullWidth
          />
        </Stack>
        <TextField
          id={`${prefix}_address`}
          label="Endereço"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          fullWidth
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            id={`${prefix}_city`}
            label="Cidade"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            fullWidth
          />
          <TextField
            id={`${prefix}_state`}
            select
            label="UF"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="">—</MenuItem>
            {BRAZIL_STATES.map((uf) => (
              <MenuItem key={uf} value={uf}>
                {uf}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            id={`${prefix}_phone`}
            label="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            fullWidth
          />
          <TextField
            id={`${prefix}_email`}
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={!!errors.email}
            helperText={errors.email}
            fullWidth
          />
        </Stack>
        <TextField
          id={`${prefix}_responsible`}
          label="Responsável"
          value={form.responsible}
          onChange={(e) => setForm({ ...form, responsible: e.target.value })}
          fullWidth
        />
        <TextField
          id={`${prefix}_notes`}
          label="Observações"
          multiline
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          fullWidth
        />
      </Stack>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <Button component={Link} to="/admin" startIcon={<ArrowLeftIcon />} size="small">
          Voltar para a fila
        </Button>
      </div>

      <h1 className="admin-title">Estações</h1>
      <p className="admin-subtitle" style={{ marginBottom: '1.5rem' }}>
        Gerencie as estações do sistema.
      </p>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nova estação
        </Button>
      </div>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            placeholder="Buscar por nome, código, cidade, responsável, site_id..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
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
                        setDebouncedSearch('');
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
            label="UF"
            value={stateFilter}
            onChange={(e) => handleStateFilterChange(e.target.value)}
            size="small"
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {BRAZIL_STATES.map((uf) => (
              <MenuItem key={uf} value={uf}>
                {uf}
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

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={activeTab} onChange={(_e: unknown, v: string) => setActiveTab(v)}>
            <Tab label="Tabela" value="table" icon={<TableChartIcon />} iconPosition="start" />
            <Tab label="Mapa" value="map" icon={<MapIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {activeTab === 'table' &&
          (loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 200 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <>
              <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
                <Stack>
                  <Typography variant="h6" component="div" fontSize="1rem" fontWeight={600}>
                    Estações cadastradas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {total.toLocaleString('pt-BR')} estação(ões)
                  </Typography>
                </Stack>
              </Toolbar>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Código</TableCell>
                    <TableCell>Cidade</TableCell>
                    <TableCell>UF</TableCell>
                    <TableCell>Criado em</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {hasActiveFilters
                            ? 'Nenhuma estação encontrada com os filtros aplicados.'
                            : 'Nenhuma estação cadastrada.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stations.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Link
                            to={`/admin/estacoes/${row.id}`}
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            <span style={{ fontWeight: 500 }}>{row.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="mono">{row.code}</span>
                        </TableCell>
                        <TableCell>{row.city ?? '—'}</TableCell>
                        <TableCell>{row.state ?? '—'}</TableCell>
                        <TableCell>{new Date(row.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                            <IconButton
                              size="small"
                              aria-label={`Editar ${row.name}`}
                              title={`Editar ${row.name}`}
                              onClick={() => openEdit(row)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              aria-label={`Remover ${row.name}`}
                              title={`Remover ${row.name}`}
                              onClick={() => setPendingDelete(row)}
                            >
                              <TrashCanIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {total > 0 && (
                <TablePagination
                  component="div"
                  count={total}
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
            </>
          ))}

        {activeTab === 'map' && (
          <Suspense
            fallback={
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: 400,
                  alignItems: 'center',
                }}
              >
                <CircularProgress size={32} />
              </Box>
            }
          >
            <StationMap stateFilter={stateFilter || undefined} />
          </Suspense>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova estação</DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 1 }}>
            {renderFormFields(createForm, setCreateForm, createErrors, 'new')}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={creating} onClick={() => void handleCreate()}>
            Criar estação
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editForm} onClose={() => setEditForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editForm ? `Editar "${editForm.name}"` : ''}</DialogTitle>
        <DialogContent>
          {editForm && (
            <Box component="form" noValidate sx={{ mt: 1 }}>
              {renderFormFields(
                editForm,
                setEditForm as (f: FormState) => void,
                editErrors,
                'edit',
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditForm(null)}>Cancelar</Button>
          <Button variant="contained" disabled={saving} onClick={() => void handleSaveEdit()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Remover estação</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover a estação <strong>{pendingDelete?.name}</strong> (
            {pendingDelete?.code})? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => void handleConfirmDelete()}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
