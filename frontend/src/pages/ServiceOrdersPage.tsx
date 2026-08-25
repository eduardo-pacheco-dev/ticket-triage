import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import AddIcon from '@mui/icons-material/Add';
import ArrowLeftIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/EditOutlined';
import TrashCanIcon from '@mui/icons-material/DeleteOutlined';
import {
  createServiceOrder,
  deleteServiceOrder,
  fetchServiceOrders,
  updateServiceOrder,
  ApiError,
} from '../lib/api';
import { createServiceOrderSchema, updateServiceOrderSchema } from '@ticket-triage/shared';
import { zodFieldErrors } from '../lib/schemas';
import { useToastStore } from '../stores/toast';
import type {
  ServiceOrder,
  ServiceOrderStatus,
  ServiceOrderPriority,
} from '../lib/types';
import {
  serviceOrderStatusLabel,
  serviceOrderPriorityLabel,
} from '../lib/types';

type SortKey = 'orderNumber' | 'clientName' | 'status' | 'priority' | 'createdAt';

const statusColors: Record<ServiceOrderStatus, 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'error',
};

const priorityColors: Record<ServiceOrderPriority, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
};

interface FormState {
  clientName: string;
  clientContact: string;
  siteId: string;
  description: string;
  priority: ServiceOrderPriority;
  assignedTo: string;
  scheduledDate: string;
  notes: string;
  status: ServiceOrderStatus;
}

const emptyForm: FormState = {
  clientName: '',
  clientContact: '',
  siteId: '',
  description: '',
  priority: 'medium',
  assignedTo: '',
  scheduledDate: '',
  notes: '',
  status: 'pending',
};

export default function ServiceOrdersPage() {
  const notify = useToastStore((s) => s.notify);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('orderNumber');
  const [sortAsc, setSortAsc] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const [editForm, setEditForm] = useState<(FormState & { id: string }) | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<ServiceOrder | null>(null);

  const reload = useCallback(async () => {
    try {
      setOrders(await fetchServiceOrders());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ordens de serviço.');
    }
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

  function openCreate() {
    setCreateForm(emptyForm);
    setCreateErrors({});
    setError(null);
    setCreateOpen(true);
  }

  function openEdit(order: ServiceOrder) {
    setEditErrors({});
    setEditForm({
      id: order.id,
      clientName: order.clientName,
      clientContact: order.clientContact ?? '',
      siteId: order.siteId ?? '',
      description: order.description,
      priority: order.priority,
      assignedTo: order.assignedTo ?? '',
      scheduledDate: order.scheduledDate
        ? new Date(order.scheduledDate).toISOString().slice(0, 16)
        : '',
      notes: order.notes ?? '',
      status: order.status,
    });
  }

  async function handleCreate() {
    setError(null);
    const parsed = createServiceOrderSchema.safeParse(createForm);
    if (!parsed.success) {
      setCreateErrors(zodFieldErrors(parsed.error));
      return;
    }
    setCreating(true);
    try {
      await createServiceOrder(parsed.data);
      notify({ kind: 'success', title: 'Ordem de serviço criada.' });
      setCreateOpen(false);
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setCreateErrors({ description: err.message });
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao criar ordem de serviço.');
        setCreateOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    setError(null);
    const parsed = updateServiceOrderSchema.safeParse(editForm);
    if (!parsed.success) {
      setEditErrors(zodFieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      await updateServiceOrder(editForm.id, parsed.data);
      notify({ kind: 'success', title: 'Ordem de serviço atualizada.' });
      setEditForm(null);
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setEditErrors({ description: err.message });
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao atualizar ordem de serviço.');
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
      await deleteServiceOrder(pendingDelete.id);
      notify({ kind: 'success', title: `Ordem #${pendingDelete.orderNumber} removida.` });
      setPendingDelete(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover ordem de serviço.');
      setPendingDelete(null);
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

  const rows = useMemo(() => {
    const mapped = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      clientName: o.clientName,
      status: serviceOrderStatusLabel[o.status],
      statusRaw: o.status,
      priority: serviceOrderPriorityLabel[o.priority],
      priorityRaw: o.priority,
      createdAt: new Date(o.createdAt).toLocaleDateString('pt-BR'),
      createdAtValue: new Date(o.createdAt).getTime(),
      order: o,
    }));
    return [...mapped].sort((a, b) => {
      let va: string | number;
      let vb: string | number;
      if (sortKey === 'orderNumber') {
        va = a.orderNumber;
        vb = b.orderNumber;
      } else if (sortKey === 'createdAt') {
        va = a.createdAtValue;
        vb = b.createdAtValue;
      } else {
        va = a[sortKey];
        vb = b[sortKey];
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [orders, sortKey, sortAsc]);

  function renderFormFields(
    form: FormState,
    setForm: (f: FormState) => void,
    errors: Record<string, string>,
    prefix: string,
  ) {
    return (
      <Stack spacing={2.5}>
        <TextField
          id={`${prefix}_client_name`}
          label="Nome do cliente"
          value={form.clientName}
          onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          error={!!errors.clientName}
          helperText={errors.clientName}
          fullWidth
        />
        <TextField
          id={`${prefix}_client_contact`}
          label="Contato do cliente"
          value={form.clientContact}
          onChange={(e) => setForm({ ...form, clientContact: e.target.value })}
          error={!!errors.clientContact}
          helperText={errors.clientContact}
          fullWidth
        />
        <TextField
          id={`${prefix}_site_id`}
          label="SITE ID"
          value={form.siteId}
          onChange={(e) => setForm({ ...form, siteId: e.target.value })}
          error={!!errors.siteId}
          helperText={errors.siteId}
          fullWidth
        />
        <TextField
          id={`${prefix}_description`}
          label="Descrição"
          multiline
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          error={!!errors.description}
          helperText={errors.description}
          fullWidth
        />
        <TextField
          id={`${prefix}_priority`}
          select
          label="Prioridade"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value as ServiceOrderPriority })}
          fullWidth
        >
          <MenuItem value="low">Baixa</MenuItem>
          <MenuItem value="medium">Média</MenuItem>
          <MenuItem value="high">Alta</MenuItem>
          <MenuItem value="urgent">Urgente</MenuItem>
        </TextField>
        <TextField
          id={`${prefix}_assigned_to`}
          label="Responsável"
          value={form.assignedTo}
          onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
          fullWidth
        />
        <TextField
          id={`${prefix}_scheduled_date`}
          label="Data agendada"
          type="datetime-local"
          value={form.scheduledDate}
          onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
          slotProps={{ htmlInput: { step: 60 } }}
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
    <div className="admin-page">
      <div style={{ marginBottom: '1rem' }}>
        <Button component={Link} to="/admin" startIcon={<ArrowLeftIcon />} size="small">
          Voltar para a fila
        </Button>
      </div>

      <h1 className="admin-title">Ordens de Serviço</h1>
      <p className="admin-subtitle" style={{ marginBottom: '1.5rem' }}>
        Gerencie as ordens de serviço do sistema.
      </p>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nova ordem
        </Button>
      </div>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 200 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
            <Stack>
              <Typography variant="h6" component="div" fontSize="1rem" fontWeight={600}>
                Ordens cadastradas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {orders.length} ordem(ns)
              </Typography>
            </Stack>
          </Toolbar>
          <Table size="medium">
            <TableHead>
              <TableRow>
                {(
                  [
                    ['orderNumber', 'Nº'],
                    ['clientName', 'Cliente'],
                    ['status', 'Status'],
                    ['priority', 'Prioridade'],
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
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <span className="mono">#{row.orderNumber}</span>
                  </TableCell>
                  <TableCell>{row.clientName}</TableCell>
                  <TableCell>
                    <Chip size="small" color={statusColors[row.statusRaw]} label={row.status} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={priorityColors[row.priorityRaw]} label={row.priority} />
                  </TableCell>
                  <TableCell>{row.createdAt}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        aria-label={`Editar ordem #${row.orderNumber}`}
                        title={`Editar ordem #${row.orderNumber}`}
                        onClick={() => openEdit(row.order)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={`Remover ordem #${row.orderNumber}`}
                        title={`Remover ordem #${row.orderNumber}`}
                        onClick={() => setPendingDelete(row.order)}
                      >
                        <TrashCanIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova ordem de serviço</DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 1 }}>
            {renderFormFields(createForm, setCreateForm, createErrors, 'new')}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={creating} onClick={() => void handleCreate()}>
            Criar ordem
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editForm} onClose={() => setEditForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editForm ? `Editar ordem #${orders.find((o) => o.id === editForm.id)?.orderNumber ?? ''}` : ''}
        </DialogTitle>
        <DialogContent>
          {editForm && (
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <Stack spacing={2.5}>
                {renderFormFields(editForm, setEditForm as (f: FormState) => void, editErrors, 'edit')}
                <TextField
                  id="edit_status"
                  select
                  label="Status"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ServiceOrderStatus })}
                  fullWidth
                >
                  <MenuItem value="pending">Pendente</MenuItem>
                  <MenuItem value="in_progress">Em Andamento</MenuItem>
                  <MenuItem value="completed">Concluída</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                </TextField>
              </Stack>
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
        <DialogTitle>Remover ordem de serviço</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover a ordem{' '}
            <strong>#{pendingDelete?.orderNumber}</strong>?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => void handleConfirmDelete()}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
