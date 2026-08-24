import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import BotIcon from '@mui/icons-material/SmartToyOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import TrashCanIcon from '@mui/icons-material/DeleteOutlined';
import UserAvatarIcon from '@mui/icons-material/PersonOutlined';
import TimeIcon from '@mui/icons-material/ScheduleOutlined';
import {
  addRequestType,
  changePassword,
  deleteRequestType,
  fetchRequestTypes,
  fetchSlaConfig,
  fetchTelegramConfig,
  testTelegram,
  updateSlaConfig,
  updateTelegramConfig,
} from '../lib/api';
import type { TelegramStatus } from '../lib/api';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { createRequestTypeSchema } from '@ticket-triage/shared';
import { changePasswordFormSchema, slaConfigSchema, zodFieldErrors } from '../lib/schemas';
import { useAuthStore } from '../stores/auth';
import type { RequestType } from '../lib/types';

type TabKey = 'geral' | 'sla' | 'bot' | 'perfil';

const TAB_KEYS: TabKey[] = ['geral', 'sla', 'bot', 'perfil'];

const TAB_ICONS = {
  geral: <SettingsIcon />,
  sla: <TimeIcon />,
  bot: <BotIcon />,
  perfil: <UserAvatarIcon />,
};

const TAB_LABELS = {
  geral: 'Geral',
  sla: 'SLA',
  bot: 'Bot',
  perfil: 'Perfil',
};

function GeralTab() {
  const [types, setTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequestTypes()
      .then(setTypes)
      .catch(() => setError('Erro ao carregar tipos.'))
      .finally(() => setLoading(false));
  }, []);

  useQueueEvents((payload) => {
    if (payload.type === 'request_types') {
      fetchRequestTypes()
        .then(setTypes)
        .catch(() => {});
    }
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const parsed = createRequestTypeSchema.safeParse({ name });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setBusy(true);
    try {
      await addRequestType(parsed.data.name);
      setName('');
      setTypes(await fetchRequestTypes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar tipo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteRequestType(id);
      setTypes(await fetchRequestTypes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover tipo.');
    }
  }

  return (
    <div>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}

      <Paper variant="outlined" className="checkin-card" sx={{ maxWidth: '100%', mt: 0 }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>
          Novo tipo de solicitação
        </h2>
        <Box component="form" onSubmit={handleAdd} noValidate>
          <div className="config-add-row">
            <TextField
              id="new_type"
              label="Nome do tipo"
              placeholder="Ex.: Vistoria Técnica"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!fieldErrors.name}
              helperText={fieldErrors.name}
              sx={{ flex: '1 1 240px' }}
            />
            <Button type="submit" startIcon={<AddIcon />} disabled={busy}>
              Adicionar
            </Button>
          </div>
        </Box>
      </Paper>

      <Paper variant="outlined" className="checkin-card" sx={{ maxWidth: '100%', mt: 2 }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>
          Tipos cadastrados
        </h2>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 100 }}>
            <CircularProgress size={28} />
          </Box>
        ) : types.length === 0 ? (
          <p className="muted">Nenhum tipo cadastrado.</p>
        ) : (
          <Stack spacing={1.5}>
            {types.map((t) => (
              <div key={t.id} className="type-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Chip size="small" color="primary" label={t.name} />
                  <span className="muted" style={{ fontSize: '0.75rem' }}>
                    Adicionado em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <Button
                  color="error"
                  size="small"
                  startIcon={<TrashCanIcon />}
                  onClick={() => void handleDelete(t.id)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </Stack>
        )}
      </Paper>
    </div>
  );
}

function SlaTab() {
  const [waitMin, setWaitMin] = useState('60');
  const [serviceMin, setServiceMin] = useState('120');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    fetchSlaConfig()
      .then((cfg) => {
        if (!mounted) return;
        setWaitMin(String(cfg.expectedWaitMin));
        setServiceMin(String(cfg.expectedServiceMin));
        setLoaded(true);
      })
      .catch(() => mounted && setError('Erro ao carregar configuração SLA.'));
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setFieldErrors({});
    const parsed = slaConfigSchema.safeParse({
      expectedWaitMin: waitMin,
      expectedServiceMin: serviceMin,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setBusy(true);
    try {
      await updateSlaConfig(parsed.data);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded && !error)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 100 }}>
        <CircularProgress size={28} />
      </Box>
    );

  return (
    <div>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
          Configuração salva!
        </Alert>
      )}

      <Paper variant="outlined" className="checkin-card" sx={{ maxWidth: '100%', mt: 0 }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>
          Metas de SLA (minutos)
        </h2>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <TextField
              id="expected_wait"
              label="Tempo máximo de espera (min)"
              type="number"
              value={waitMin}
              onChange={(e) => setWaitMin(e.target.value)}
              error={!!fieldErrors.expectedWaitMin}
              helperText={fieldErrors.expectedWaitMin}
              required
              slotProps={{ htmlInput: { min: 1, max: 1440 } }}
              fullWidth
            />
            <TextField
              id="expected_service"
              label="Tempo máximo de atendimento (min)"
              type="number"
              value={serviceMin}
              onChange={(e) => setServiceMin(e.target.value)}
              error={!!fieldErrors.expectedServiceMin}
              helperText={fieldErrors.expectedServiceMin}
              required
              slotProps={{ htmlInput: { min: 1, max: 1440 } }}
              fullWidth
            />
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando...' : 'Salvar'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </div>
  );
}

function BotTab() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTelegramConfig()
      .then((s) => {
        setStatus(s);
        setChatId(s.chatId ?? '');
      })
      .catch(() => setError('Erro ao carregar configuração do bot.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const payload: { token?: string; chatId?: string } = {};
      if (token.trim()) payload.token = token.trim();
      if (chatId.trim() !== (status?.chatId ?? '')) payload.chatId = chatId.trim();
      const updated = await updateTelegramConfig(payload);
      setStatus(updated);
      setToken('');
      setSuccess('Configuração salva e aplicada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configuração.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const result = await testTelegram();
      if (result.ok) {
        setSuccess('Mensagem de teste enviada! Verifique o Telegram.');
      } else {
        setError(`Falha no envio: ${result.error ?? 'motivo desconhecido'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao testar envio.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePolling(next: boolean) {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const updated = await updateTelegramConfig({ polling: next });
      setStatus(updated);
      setSuccess(next ? 'Polling ligado.' : 'Polling desligado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar polling.');
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 100 }}>
        <CircularProgress size={28} />
      </Box>
    );

  const tagText = !status?.tokenMasked
    ? 'Inativo'
    : !status.polling
      ? 'Pausado'
      : status.configured
        ? 'Ativo'
        : 'Aguardando inscrição';
  const chipColor = tagText === 'Ativo' ? 'success' : tagText === 'Pausado' ? 'warning' : 'default';

  return (
    <div>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper variant="outlined" className="checkin-card" sx={{ maxWidth: '100%', mt: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', margin: 0, fontWeight: 500 }}>Bot do Telegram</h2>
          <Chip size="small" color={chipColor} label={tagText} />
          {status?.tokenMasked && (
            <span className="muted" style={{ fontSize: '0.75rem' }}>
              Token: {status.tokenMasked}
            </span>
          )}
          {status && (
            <span className="muted" style={{ fontSize: '0.75rem' }}>
              Chats inscritos: <strong>{status.chatsCount}</strong>
            </span>
          )}
        </div>
        <FormControlLabel
          sx={{ mb: 3 }}
          control={
            <Switch
              id="bot_polling"
              checked={status?.polling ?? false}
              disabled={busy || !status?.tokenMasked}
              onChange={(e) => void handleTogglePolling(e.target.checked)}
            />
          }
          label="Receber eventos (long polling)"
        />
        <Box component="form" onSubmit={handleSave} noValidate>
          <Stack spacing={3}>
            <TextField
              id="bot_token"
              label={
                status?.tokenMasked ? 'Novo token (deixe vazio para manter)' : 'Token do @BotFather'
              }
              type="password"
              placeholder="Ex.: 123456789:AA..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              fullWidth
            />
            <TextField
              id="bot_chat"
              label="Chat ID fixo adicional (opcional)"
              placeholder="Ex.: -1001234567890"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              autoComplete="off"
              fullWidth
            />
            <p className="muted" style={{ fontSize: '0.8125rem', margin: 0 }}>
              Como inscrever chats: adicione o bot ao grupo ou mande <strong>/start</strong> no
              privado — qualquer chat que enviar mensagem ao bot passa a receber as notificações
              automaticamente.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" disabled={busy}>
                {busy ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                type="button"
                variant="outlined"
                disabled={busy || !status?.configured}
                onClick={() => void handleTest()}
              >
                Testar envio
              </Button>
            </div>
          </Stack>
        </Box>
      </Paper>

      <Paper variant="outlined" className="checkin-card" sx={{ maxWidth: '100%', mt: 2 }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem', fontWeight: 500 }}>
          O que o bot envia
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Novos check-ins e mudanças de status das solicitações (análise iniciada, aprovada,
          recusada, reaberta), com protocolo e dados da unidade — entregues a todos os chats
          inscritos.
        </p>
      </Paper>
    </div>
  );
}

function PerfilTab() {
  const applyAccessToken = useAuthStore((s) => s.applyAccessToken);
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setFieldErrors({});
    const parsed = changePasswordFormSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setBusy(true);
    try {
      const result = await changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });
      applyAccessToken(result.access_token);
      clearMustChangePassword();
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {mustChangePassword && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          <strong>Troca de senha obrigatória.</strong> Por segurança, defina uma nova senha antes de
          usar o painel.
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
          Senha alterada com sucesso!
        </Alert>
      )}

      <Paper variant="outlined" className="checkin-card" sx={{ maxWidth: '100%', mt: 0 }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>Alterar senha</h2>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <TextField
              id="current_password"
              label="Senha atual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={!!fieldErrors.currentPassword}
              helperText={fieldErrors.currentPassword}
              required
              autoComplete="current-password"
              fullWidth
            />
            <TextField
              id="new_password"
              label="Nova senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={!!fieldErrors.newPassword}
              helperText={fieldErrors.newPassword}
              required
              slotProps={{ htmlInput: { minLength: 6 } }}
              autoComplete="new-password"
              fullWidth
            />
            <TextField
              id="confirm_password"
              label="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
              required
              autoComplete="new-password"
              fullWidth
            />
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando...' : 'Salvar senha'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </div>
  );
}

export default function ConfigPage() {
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const [tab, setTab] = useState<TabKey>(mustChangePassword ? 'perfil' : 'geral');

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Configurações</h1>
          <p className="admin-subtitle">Tipos de solicitação, metas de SLA e sua conta.</p>
        </div>
      </div>

      {mustChangePassword && tab !== 'perfil' && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          <strong>Troca de senha obrigatória.</strong> Abra a aba Perfil para definir uma nova
          senha.
          <Box sx={{ mt: 1 }}>
            <Button size="small" onClick={() => setTab('perfil')}>
              Ir para o perfil
            </Button>
          </Box>
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, next: TabKey) => setTab(next)}
        aria-label="Configurações"
        sx={{ mb: 2 }}
      >
        {TAB_KEYS.map((key) => (
          <Tab
            key={key}
            value={key}
            icon={TAB_ICONS[key]}
            iconPosition="start"
            label={TAB_LABELS[key]}
          />
        ))}
      </Tabs>

      {tab === 'geral' && <GeralTab />}
      {tab === 'sla' && <SlaTab />}
      {tab === 'bot' && <BotTab />}
      {tab === 'perfil' && <PerfilTab />}
    </div>
  );
}
