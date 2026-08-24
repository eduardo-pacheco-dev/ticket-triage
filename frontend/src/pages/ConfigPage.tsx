import { useEffect, useState } from 'react';
import {
  Button,
  Form,
  InlineNotification,
  Loading,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextInput,
  Tile,
} from '@carbon/react';
import { Add, Bot, Settings, TrashCan, UserAvatar, Time } from '@carbon/icons-react';
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
          Novo tipo de solicitação
        </h2>
        <Form onSubmit={handleAdd}>
          <div className="config-add-row">
            <TextInput
              id="new_type"
              labelText="Nome do tipo"
              placeholder="Ex.: Vistoria Técnica"
              value={name}
              onChange={(e) => setName(e.target.value)}
              invalid={!!fieldErrors.name}
              invalidText={fieldErrors.name}
            />
            <Button type="submit" renderIcon={Add} disabled={busy}>
              Adicionar
            </Button>
          </div>
        </Form>
      </Tile>

      <Tile className="checkin-card" style={{ maxWidth: '100%', marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>
          Tipos cadastrados
        </h2>
        {loading ? (
          <div style={{ position: 'relative', minHeight: 100 }}>
            <Loading withOverlay={false} />
          </div>
        ) : types.length === 0 ? (
          <p className="muted">Nenhum tipo cadastrado.</p>
        ) : (
          <Stack gap={3}>
            {types.map((t) => (
              <div key={t.id} className="type-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Tag type="blue" size="sm">
                    {t.name}
                  </Tag>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>
                    Adicionado em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <Button
                  kind="danger--ghost"
                  size="sm"
                  renderIcon={TrashCan}
                  onClick={() => void handleDelete(t.id)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </Stack>
        )}
      </Tile>
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

  if (!loaded && !error) return <Loading withOverlay={false} />;

  return (
    <div>
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Erro"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
        />
      )}
      {success && (
        <InlineNotification
          kind="success"
          lowContrast
          title="Configuração salva!"
          hideCloseButton
        />
      )}

      <Tile className="checkin-card" style={{ maxWidth: '100%', marginTop: 0 }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>
          Metas de SLA (minutos)
        </h2>
        <Form onSubmit={handleSubmit}>
          <Stack gap={6}>
            <TextInput
              id="expected_wait"
              labelText="Tempo máximo de espera (min)"
              type="number"
              value={waitMin}
              onChange={(e) => setWaitMin(e.target.value)}
              invalid={!!fieldErrors.expectedWaitMin}
              invalidText={fieldErrors.expectedWaitMin}
              required
              min={1}
              max={1440}
            />
            <TextInput
              id="expected_service"
              labelText="Tempo máximo de atendimento (min)"
              type="number"
              value={serviceMin}
              onChange={(e) => setServiceMin(e.target.value)}
              invalid={!!fieldErrors.expectedServiceMin}
              invalidText={fieldErrors.expectedServiceMin}
              required
              min={1}
              max={1440}
            />
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando...' : 'Salvar'}
            </Button>
          </Stack>
        </Form>
      </Tile>
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

  if (loading) return <Loading withOverlay={false} />;

  return (
    <div>
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Erro"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
        />
      )}
      {success && (
        <InlineNotification
          kind="success"
          lowContrast
          title="Sucesso"
          subtitle={success}
          onCloseButtonClick={() => setSuccess(null)}
        />
      )}

      <Tile className="checkin-card" style={{ maxWidth: '100%', marginTop: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', margin: 0, fontWeight: 500 }}>Bot do Telegram</h2>
          <Tag type={status?.configured ? 'green' : 'gray'} size="sm">
            {status?.configured ? 'Ativo' : status?.receiving ? 'Aguardando chat' : 'Inativo'}
          </Tag>
          {status?.tokenMasked && (
            <span className="muted" style={{ fontSize: '0.75rem' }}>
              Token: {status.tokenMasked}
            </span>
          )}
        </div>
        <Form onSubmit={handleSave}>
          <Stack gap={6}>
            <TextInput
              id="bot_token"
              labelText={status?.tokenMasked ? 'Novo token (deixe vazio para manter)' : 'Token do @BotFather'}
              type="password"
              placeholder="Ex.: 123456789:AA..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
            <TextInput
              id="bot_chat"
              labelText="Chat ID de destino"
              placeholder="Ex.: -1001234567890"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              autoComplete="off"
            />
            <p className="muted" style={{ fontSize: '0.8125rem', margin: 0 }}>
              Como descobrir o Chat ID: salve o token, adicione o bot ao grupo (ou mande /start no privado)
              e envie o comando <strong>/id</strong> para ele.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" disabled={busy}>
                {busy ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                type="button"
                kind="secondary"
                disabled={busy || !status?.configured}
                onClick={() => void handleTest()}
              >
                Testar envio
              </Button>
            </div>
          </Stack>
        </Form>
      </Tile>

      <Tile className="checkin-card" style={{ maxWidth: '100%', marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem', fontWeight: 500 }}>O que o bot envia</h2>
        <p className="muted" style={{ margin: 0 }}>
          Novos check-ins e mudanças de status das solicitações (análise iniciada, aprovada, recusada,
          reaberta), com protocolo e dados da unidade.
        </p>
      </Tile>
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
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Troca de senha obrigatória"
          subtitle="Por segurança, defina uma nova senha antes de usar o painel."
          style={{ marginBottom: '1rem' }}
        />
      )}
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Erro"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
        />
      )}
      {success && (
        <InlineNotification
          kind="success"
          lowContrast
          title="Senha alterada com sucesso!"
          hideCloseButton
        />
      )}

      <Tile className="checkin-card" style={{ maxWidth: '100%', marginTop: 0 }}>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>Alterar senha</h2>
        <Form onSubmit={handleSubmit}>
          <Stack gap={6}>
            <TextInput
              id="current_password"
              labelText="Senha atual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              invalid={!!fieldErrors.currentPassword}
              invalidText={fieldErrors.currentPassword}
              required
              autoComplete="current-password"
            />
            <TextInput
              id="new_password"
              labelText="Nova senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              invalid={!!fieldErrors.newPassword}
              invalidText={fieldErrors.newPassword}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <TextInput
              id="confirm_password"
              labelText="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              invalid={!!fieldErrors.confirmPassword}
              invalidText={fieldErrors.confirmPassword}
              required
              autoComplete="new-password"
            />
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando...' : 'Salvar senha'}
            </Button>
          </Stack>
        </Form>
      </Tile>
    </div>
  );
}

export default function ConfigPage() {
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const defaultIndex = mustChangePassword ? 3 : 0;
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
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Troca de senha obrigatória"
          subtitle="Abra a aba Perfil para definir uma nova senha."
        >
          <Button size="sm" kind="ghost" onClick={() => setTab('perfil')}>
            Ir para o perfil
          </Button>
        </InlineNotification>
      )}

      <Tabs
        defaultSelectedIndex={defaultIndex}
        onChange={(state) => setTab((['geral', 'sla', 'bot', 'perfil'] as const)[state.selectedIndex])}
      >
        <TabList aria-label="Configurações">
          <Tab renderIcon={Settings}>Geral</Tab>
          <Tab renderIcon={Time}>SLA</Tab>
          <Tab renderIcon={Bot}>Bot</Tab>
          <Tab renderIcon={UserAvatar}>Perfil</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <GeralTab />
          </TabPanel>
          <TabPanel>
            <SlaTab />
          </TabPanel>
          <TabPanel>
            <BotTab />
          </TabPanel>
          <TabPanel>
            <PerfilTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
