import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Checkbox,
  DataTable,
  Form,
  InlineNotification,
  Loading,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
} from '@carbon/react';
import { Add, ArrowLeft, Edit, TrashCan } from '@carbon/icons-react';
import { AppHeader } from '../components/AppHeader';
import { createUser, deleteUser, fetchUsers, updateUser, ApiError } from '../lib/api';
import { createUserFormSchema, updateUserFormSchema, zodFieldErrors } from '../lib/schemas';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import type { SafeUser, UserRole, UserStatus } from '../lib/types';

const headers = [
  { key: 'username', header: 'Usuário' },
  { key: 'role', header: 'Papel' },
  { key: 'situacao', header: 'Situação' },
  { key: 'createdAt', header: 'Criado em' },
  { key: 'actions', header: '' },
];

const userStatusLabel: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

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

  const rows = users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    status: u.status,
    situacao: userStatusLabel[u.status],
    createdAt: new Date(u.createdAt).toLocaleDateString('pt-BR'),
    user: u,
    isSelf: u.username === currentUsername,
  }));

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main" style={{ maxWidth: 1200 }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link to="/admin">
            <Button kind="ghost" renderIcon={ArrowLeft} size="sm">
              Voltar para a fila
            </Button>
          </Link>
        </div>

        <h1 className="admin-title">Usuários</h1>
        <p className="admin-subtitle" style={{ marginBottom: '1.5rem' }}>
          Gerencie os acessos ao painel administrativo.
        </p>

        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            title="Erro"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button kind="primary" renderIcon={Add} onClick={openCreate}>
            Novo usuário
          </Button>
        </div>

        {loading ? (
          <div style={{ position: 'relative', minHeight: 200 }}>
            <Loading withOverlay={false} />
          </div>
        ) : (
          <DataTable rows={rows} headers={headers} isSortable>
            {({ rows: r, headers: h, getHeaderProps, getRowProps, getTableProps }) => (
              <TableContainer
                title="Usuários cadastrados"
                description={`${users.length} acesso(s)`}
              >
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {h.map((header) => {
                        const { key: hk, ...hp } = getHeaderProps({ header });
                        return (
                          <TableHeader key={hk} {...hp}>
                            {header.header}
                          </TableHeader>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.map((row) => {
                      const found = rows.find((x) => x.id === row.id);
                      if (!found) return null;
                      const { key: rk, ...rp } = getRowProps({ row });
                      return (
                        <TableRow key={rk} {...rp}>
                          <TableCell>
                            <span className="mono">{found.username}</span>
                            {found.isSelf && (
                              <Tag type="cool-gray" size="sm" style={{ marginLeft: '0.5rem' }}>
                                você
                              </Tag>
                            )}
                          </TableCell>
                          <TableCell>
                            {found.role === 'admin' ? (
                              <Tag type="blue" size="sm">
                                Administrador
                              </Tag>
                            ) : (
                              <Tag type="cool-gray" size="sm">
                                Usuário
                              </Tag>
                            )}
                          </TableCell>
                          <TableCell>
                            <Stack orientation="horizontal" gap={2}>
                              {found.status === 'active' ? (
                                <Tag type="green" size="sm">
                                  Ativo
                                </Tag>
                              ) : (
                                <Tag type="red" size="sm">
                                  Inativo
                                </Tag>
                              )}
                              {found.user.mustChangePassword && (
                                <Tag type="purple" size="sm">
                                  Troca de senha pendente
                                </Tag>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>{found.createdAt}</TableCell>
                          <TableCell>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <Button
                                kind="ghost"
                                size="sm"
                                hasIconOnly
                                renderIcon={Edit}
                                iconDescription={`Editar ${found.username}`}
                                tooltipPosition="left"
                                onClick={() => openEdit(found.user)}
                              />
                              {!found.isSelf && (
                                <Button
                                  kind="danger--ghost"
                                  size="sm"
                                  hasIconOnly
                                  renderIcon={TrashCan}
                                  iconDescription={`Remover ${found.username}`}
                                  tooltipPosition="left"
                                  onClick={() => setPendingDelete(found.user)}
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}

        <Modal
          open={createOpen}
          modalHeading="Novo usuário"
          modalLabel="Usuários"
          primaryButtonText="Criar usuário"
          secondaryButtonText="Cancelar"
          primaryButtonDisabled={creating}
          onRequestClose={() => setCreateOpen(false)}
          onRequestSubmit={() => void handleCreate()}
        >
          <Form style={{ marginBottom: '1rem' }}>
            <Stack gap={5}>
              <TextInput
                id="new_user_username"
                labelText="Usuário"
                placeholder="Ex.: jsilva"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                invalid={!!createErrors.username}
                invalidText={createErrors.username}
              />
              <Select
                id="new_user_role"
                labelText="Papel"
                helperText="Administradores gerenciam usuários e configurações."
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
              >
                <SelectItem value="user" text="Usuário" />
                <SelectItem value="admin" text="Administrador" />
              </Select>
              <TextInput
                id="new_user_password"
                labelText="Senha provisória"
                helperText="O usuário deverá trocá-la no primeiro acesso."
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                invalid={!!createErrors.password}
                invalidText={createErrors.password}
              />
              <TextInput
                id="new_user_confirm"
                labelText="Confirmar senha"
                type="password"
                value={newConfirm}
                onChange={(e) => setNewConfirm(e.target.value)}
                invalid={!!createErrors.confirmPassword}
                invalidText={createErrors.confirmPassword}
              />
            </Stack>
          </Form>
        </Modal>

        <Modal
          open={!!editForm}
          modalHeading={editForm ? `Editar "${editForm.user.username}"` : ''}
          modalLabel="Usuários"
          primaryButtonText="Salvar"
          secondaryButtonText="Cancelar"
          primaryButtonDisabled={saving}
          onRequestClose={() => setEditForm(null)}
          onRequestSubmit={() => void handleSaveEdit()}
        >
          {editForm && (
            <Form style={{ marginBottom: '1rem' }}>
              <Stack gap={5}>
                <TextInput
                  id="edit_username"
                  labelText="Usuário"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  invalid={!!editErrors.username}
                  invalidText={editErrors.username}
                />
                <Select
                  id="edit_role"
                  labelText="Papel"
                  disabled={editForm.user.username === currentUsername}
                  helperText={
                    editForm.user.username === currentUsername
                      ? 'Você não pode alterar o seu próprio papel.'
                      : undefined
                  }
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                >
                  <SelectItem value="user" text="Usuário" />
                  <SelectItem value="admin" text="Administrador" />
                </Select>
                <Select
                  id="edit_status"
                  labelText="Situação"
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
                >
                  <SelectItem value="active" text="Ativo" />
                  <SelectItem value="inactive" text="Inativo" />
                </Select>
                <TextInput
                  id="edit_password"
                  labelText="Nova senha (opcional)"
                  helperText="Se preenchida, as sessões ativas serão encerradas."
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  invalid={!!editErrors.password}
                  invalidText={editErrors.password}
                />
                <TextInput
                  id="edit_confirm_password"
                  labelText="Confirmar nova senha"
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                  invalid={!!editErrors.confirmPassword}
                  invalidText={editErrors.confirmPassword}
                />
                <Checkbox
                  id="edit_must_change"
                  labelText="Exigir troca de senha no próximo acesso"
                  checked={editForm.mustChangePassword}
                  onChange={(_, { checked }) =>
                    setEditForm({ ...editForm, mustChangePassword: checked })
                  }
                />
              </Stack>
            </Form>
          )}
        </Modal>

        <Modal
          open={!!pendingDelete}
          modalHeading="Remover usuário"
          danger
          primaryButtonText="Remover"
          secondaryButtonText="Cancelar"
          onRequestClose={() => setPendingDelete(null)}
          onRequestSubmit={() => void handleConfirmDelete()}
        >
          <p>
            Tem certeza que deseja remover o usuário <strong>{pendingDelete?.username}</strong>?
            Esta ação não pode ser desfeita.
          </p>
        </Modal>
      </main>
    </div>
  );
}
