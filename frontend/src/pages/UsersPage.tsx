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
  Tile,
} from '@carbon/react';
import { Add, ArrowLeft, Edit, TrashCan } from '@carbon/icons-react';
import { AppHeader } from '../components/AppHeader';
import { createUser, deleteUser, fetchUsers, updateUser, ApiError } from '../lib/api';
import { createUserFormSchema, updateUserFormSchema, zodFieldErrors } from '../lib/schemas';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import type { SafeUser } from '../lib/types';

const headers = [
  { key: 'username', header: 'Usuário' },
  { key: 'mustChangePassword', header: 'Situação' },
  { key: 'createdAt', header: 'Criado em' },
  { key: 'actions', header: '' },
];

interface EditFormState {
  user: SafeUser;
  username: string;
  password: string;
  confirmPassword: string;
  mustChangePassword: boolean;
}

export default function UsersPage() {
  const notify = useToastStore((s) => s.notify);
  const currentUsername = useAuthStore((s) => s.username);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = createUserFormSchema.safeParse({
      username: newUsername,
      password: newPassword,
      confirmPassword: newConfirm,
    });
    if (!parsed.success) {
      setCreateErrors(zodFieldErrors(parsed.error));
      return;
    }
    setCreating(true);
    try {
      await createUser(parsed.data);
      notify({ kind: 'success', title: `Usuário "${parsed.data.username}" criado.` });
      setNewUsername('');
      setNewPassword('');
      setNewConfirm('');
      setCreateErrors({});
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setCreateErrors({ username: err.message });
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao criar usuário.');
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
    });
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    setError(null);

    const parsed = updateUserFormSchema.safeParse({
      username: editForm.username,
      password: editForm.password,
      confirmPassword: editForm.confirmPassword,
      mustChangePassword: editForm.mustChangePassword,
    });
    if (!parsed.success) {
      setEditErrors(zodFieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (parsed.data.username !== editForm.user.username) payload.username = parsed.data.username;
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
    mustChangePassword: u.mustChangePassword,
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

        <Tile className="checkin-card" style={{ maxWidth: '100%', marginTop: 0 }}>
          <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>
            Novo usuário
          </h2>
          <p style={{ color: '#525252', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            A senha deverá ser trocada no primeiro acesso.
          </p>
          <Form onSubmit={handleCreate}>
            <Stack gap={5} orientation="horizontal">
              <TextInput
                id="new_user_username"
                labelText="Usuário"
                placeholder="Ex.: jsilva"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                invalid={!!createErrors.username}
                invalidText={createErrors.username}
              />
              <TextInput
                id="new_user_password"
                labelText="Senha provisória"
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
              <div style={{ alignSelf: 'end' }}>
                <Button type="submit" renderIcon={Add} disabled={creating}>
                  Adicionar
                </Button>
              </div>
            </Stack>
          </Form>
        </Tile>

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
                            {found.mustChangePassword ? (
                              <Tag type="purple" size="sm">
                                Deve trocar a senha
                              </Tag>
                            ) : (
                              <Tag type="green" size="sm">
                                Ativo
                              </Tag>
                            )}
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
          open={!!editForm}
          modalHeading={editForm ? `Editar "${editForm.user.username}"` : ''}
          modalLabel="Usuários"
          primaryButtonText="Salvar"
          secondaryButtonText="Cancelar"
          primaryButtonDisabled={saving}
          onRequestClose={() => setEditForm(null)}
          onSubmit={() => void handleSaveEdit()}
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
          onSubmit={() => void handleConfirmDelete()}
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
