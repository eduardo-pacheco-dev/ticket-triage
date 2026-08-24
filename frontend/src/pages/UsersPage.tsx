import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
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
import { createUser, deleteUser, fetchUsers, updateUser, ApiError } from '../lib/api';
import { createUserFormSchema, updateUserFormSchema, zodFieldErrors } from '../lib/schemas';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import type { SafeUser, UserRole, UserStatus } from '../lib/types';

const userStatusLabel: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

type SortKey = 'username' | 'role' | 'situacao' | 'createdAt';

interface EditFormState {
  user: SafeUser;
  username: string;
  password: string;
  confirmPassword: string;
  mustChangePassword: boolean;
  role: UserRole;
  status: UserStatus;
}

export default function UsersPage() {
  const notify = useToastStore((s) => s.notify);
  const currentUsername = useAuthStore((s) => s.username);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('username');
  const [sortAsc, setSortAsc] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [creating, setCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<SafeUser | null>(null);

  const reload = useCallback(async () => {
    try {
      setUsers(await fetchUsers());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.');
    }
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, [reload]);

  function openCreate() {
    setNewUsername('');
    setNewPassword('');
    setNewConfirm('');
    setNewRole('user');
    setCreateErrors({});
    setError(null);
    setCreateOpen(true);
  }

  async function handleCreate() {
    setError(null);

    const parsed = createUserFormSchema.safeParse({
      username: newUsername,
      password: newPassword,
      confirmPassword: newConfirm,
      role: newRole,
    });
    if (!parsed.success) {
      setCreateErrors(zodFieldErrors(parsed.error));
      return;
    }
    setCreating(true);
    try {
      await createUser(parsed.data);
      notify({ kind: 'success', title: `Usuário "${parsed.data.username}" criado.` });
      setCreateOpen(false);
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setCreateErrors({ username: err.message });
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao criar usuário.');
        setCreateOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }

  function openEdit(user: SafeUser) {
    setEditErrors({});
    setEditForm({
      user,
      username: user.username,
      password: '',
      confirmPassword: '',
      mustChangePassword: user.mustChangePassword,
      role: user.role,
      status: user.status,
    });
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    setError(null);

    const isSelf = editForm.user.username === currentUsername;

    const parsed = updateUserFormSchema.safeParse({
      username: editForm.username,
      password: editForm.password,
      confirmPassword: editForm.confirmPassword,
      mustChangePassword: editForm.mustChangePassword,
      role: editForm.role,
      status: editForm.status,
    });
    if (!parsed.success) {
      setEditErrors(zodFieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (parsed.data.username !== editForm.user.username) payload.username = parsed.data.username;
      if (!isSelf && parsed.data.role !== editForm.user.role) payload.role = parsed.data.role;
      if (!isSelf && parsed.data.status !== editForm.user.status)
        payload.status = parsed.data.status;
      if (parsed.data.password) {
        payload.password = parsed.data.password;
        payload.mustChangePassword = parsed.data.mustChangePassword;
      } else if (parsed.data.mustChangePassword !== editForm.user.mustChangePassword) {
        payload.mustChangePassword = parsed.data.mustChangePassword;
      }
      if (Object.keys(payload).length > 0) {
        await updateUser(editForm.user.id, payload);
        notify({ kind: 'success', title: 'Usuário atualizado.' });
      }
      setEditForm(null);
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setEditErrors({ username: err.message });
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário.');
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
      await deleteUser(pendingDelete.id);
      notify({ kind: 'success', title: `Usuário "${pendingDelete.username}" removido.` });
      setPendingDelete(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover usuário.');
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
    const mapped = users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      situacao: userStatusLabel[u.status],
      createdAt: new Date(u.createdAt).toLocaleDateString('pt-BR'),
      createdAtValue: new Date(u.createdAt).getTime(),
      user: u,
      isSelf: u.username === currentUsername,
    }));
    return [...mapped].sort((a, b) => {
      const va = a[sortKey === 'createdAt' ? 'createdAtValue' : sortKey];
      const vb = b[sortKey === 'createdAt' ? 'createdAtValue' : sortKey];
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [users, sortKey, sortAsc, currentUsername]);

  return (
    <div className="admin-page">
      <div style={{ marginBottom: '1rem' }}>
        <Button component={Link} to="/admin" startIcon={<ArrowLeftIcon />} size="small">
          Voltar para a fila
        </Button>
      </div>

      <h1 className="admin-title">Usuários</h1>
      <p className="admin-subtitle" style={{ marginBottom: '1.5rem' }}>
        Gerencie os acessos ao painel administrativo.
      </p>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Novo usuário
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
                Usuários cadastrados
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {users.length} acesso(s)
              </Typography>
            </Stack>
          </Toolbar>
          <Table size="medium">
            <TableHead>
              <TableRow>
                {(
                  [
                    ['username', 'Usuário'],
                    ['role', 'Papel'],
                    ['situacao', 'Situação'],
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
                    <span className="mono">{row.username}</span>
                    {row.isSelf && <Chip size="small" sx={{ ml: 1 }} label="você" />}
                  </TableCell>
                  <TableCell>
                    {row.role === 'admin' ? (
                      <Chip size="small" color="primary" label="Administrador" />
                    ) : (
                      <Chip size="small" label="Usuário" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                      {row.status === 'active' ? (
                        <Chip size="small" color="success" label="Ativo" />
                      ) : (
                        <Chip size="small" color="error" label="Inativo" />
                      )}
                      {row.user.mustChangePassword && (
                        <Chip
                          size="small"
                          color="secondary"
                          variant="outlined"
                          label="Troca de senha pendente"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{row.createdAt}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        aria-label={`Editar ${row.username}`}
                        title={`Editar ${row.username}`}
                        onClick={() => openEdit(row.user)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {!row.isSelf && (
                        <IconButton
                          size="small"
                          aria-label={`Remover ${row.username}`}
                          title={`Remover ${row.username}`}
                          onClick={() => setPendingDelete(row.user)}
                        >
                          <TrashCanIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo usuário</DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 1 }}>
            <Stack spacing={2.5}>
              <TextField
                id="new_user_username"
                label="Usuário"
                placeholder="Ex.: jsilva"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                error={!!createErrors.username}
                helperText={createErrors.username}
                fullWidth
              />
              <TextField
                id="new_user_role"
                select
                label="Papel"
                helperText="Administradores gerenciam usuários e configurações."
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                fullWidth
              >
                <MenuItem value="user">Usuário</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
              </TextField>
              <TextField
                id="new_user_password"
                label="Senha provisória"
                helperText={
                  createErrors.password ?? 'O usuário deverá trocá-la no primeiro acesso.'
                }
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={!!createErrors.password}
                fullWidth
              />
              <TextField
                id="new_user_confirm"
                label="Confirmar senha"
                type="password"
                value={newConfirm}
                onChange={(e) => setNewConfirm(e.target.value)}
                error={!!createErrors.confirmPassword}
                helperText={createErrors.confirmPassword}
                fullWidth
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={creating} onClick={() => void handleCreate()}>
            Criar usuário
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editForm} onClose={() => setEditForm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editForm ? `Editar "${editForm.user.username}"` : ''}</DialogTitle>
        <DialogContent>
          {editForm && (
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <Stack spacing={2.5}>
                <TextField
                  id="edit_username"
                  label="Usuário"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  error={!!editErrors.username}
                  helperText={editErrors.username}
                  fullWidth
                />
                <TextField
                  id="edit_role"
                  select
                  label="Papel"
                  disabled={editForm.user.username === currentUsername}
                  helperText={
                    editForm.user.username === currentUsername
                      ? 'Você não pode alterar o seu próprio papel.'
                      : undefined
                  }
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  fullWidth
                >
                  <MenuItem value="user">Usuário</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                </TextField>
                <TextField
                  id="edit_status"
                  select
                  label="Situação"
                  disabled={editForm.user.username === currentUsername}
                  helperText={
                    editForm.user.username === currentUsername
                      ? 'Você não pode alterar o seu próprio status.'
                      : 'Inativar encerra as sessões ativas do usuário.'
                  }
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value as UserStatus })
                  }
                  fullWidth
                >
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="inactive">Inativo</MenuItem>
                </TextField>
                <TextField
                  id="edit_password"
                  label="Nova senha (opcional)"
                  helperText={
                    editErrors.password ?? 'Se preenchida, as sessões ativas serão encerradas.'
                  }
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  error={!!editErrors.password}
                  fullWidth
                />
                <TextField
                  id="edit_confirm_password"
                  label="Confirmar nova senha"
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                  error={!!editErrors.confirmPassword}
                  helperText={editErrors.confirmPassword}
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editForm.mustChangePassword}
                      onChange={(e) =>
                        setEditForm({ ...editForm, mustChangePassword: e.target.checked })
                      }
                    />
                  }
                  label="Exigir troca de senha no próximo acesso"
                />
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
        <DialogTitle>Remover usuário</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover o usuário <strong>{pendingDelete?.username}</strong>?
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
