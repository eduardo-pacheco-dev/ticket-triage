import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Tile,
  Form,
  Stack,
  TextInput,
  Button,
  InlineNotification,
  Loading,
  Tag,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@carbon/react';
import { Add, TrashCan, ArrowLeft, Settings, UserAvatar, Time } from '@carbon/icons-react';
import { AppHeader } from '../components/AppHeader';
import {
  fetchRequestTypes,
  addRequestType,
  deleteRequestType,
  changePassword,
  fetchSlaConfig,
  updateSlaConfig,
} from '../lib/api';
import type { RequestType } from '../lib/types';

function GeralTab() {
  const [types, setTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let firstLoad = true;
    const load = () => {
      fetchRequestTypes()
        .then((rows) => mounted && setTypes(rows))
        .catch(() => mounted && setError('Erro ao carregar tipos.'))
        .finally(() => {
          if (mounted && firstLoad) {
            firstLoad = false;
            setLoading(false);
          }
        });
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addRequestType(name);
      setName('');
      const rows = await fetchRequestTypes();
      setTypes(rows);
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
      const rows = await fetchRequestTypes();
      setTypes(rows);
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
          <Stack gap={5} orientation="horizontal">
            <TextInput
              id="new_type"
              labelText="Nome do tipo"
              placeholder="Ex.: Vistoria Técnica"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div style={{ alignSelf: 'end' }}>
              <Button type="submit" renderIcon={Add} disabled={busy}>
                Adicionar
              </Button>
            </div>
          </Stack>
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
          <p style={{ color: '#525252' }}>Nenhum tipo cadastrado.</p>
        ) : (
          <Stack gap={3}>
            {types.map((t) => (
              <div key={t.id} className="type-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Tag type="blue">{t.name}</Tag>
                  <span style={{ color: '#525252', fontSize: '0.75rem' }}>
                    Adicionado em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <Button
                  kind="danger--ghost"
                  size="sm"
                  renderIcon={TrashCan}
                  onClick={() => handleDelete(t.id)}
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
    setBusy(true);
    try {
      await updateSlaConfig({
        expectedWaitMin: Number(waitMin),
        expectedServiceMin: Number(serviceMin),
      });
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
        <InlineNotification kind="success" lowContrast title="Configuração salva!" hideCloseButton />
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

function PerfilTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
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
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>
          Alterar senha
        </h2>
        <Form onSubmit={handleSubmit}>
          <Stack gap={6}>
            <TextInput
              id="current_password"
              labelText="Senha atual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <TextInput
              id="new_password"
              labelText="Nova senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main" style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link to="/admin">
            <Button kind="ghost" renderIcon={ArrowLeft} size="sm">
              Voltar para a fila
            </Button>
          </Link>
        </div>

        <h1 className="admin-title">Configurações</h1>

        <Tabs>
          <TabList aria-label="Configurações">
            <Tab renderIcon={Settings}>Geral</Tab>
            <Tab renderIcon={Time}>SLA</Tab>
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
              <PerfilTab />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </main>
    </div>
  );
}
