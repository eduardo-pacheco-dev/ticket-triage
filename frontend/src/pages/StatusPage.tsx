import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Tile,
  Tag,
  Button,
  InlineNotification,
  Loading,
  ProgressIndicator,
  ProgressStep,
  Stack,
} from '@carbon/react';
import { ArrowLeft } from '@carbon/icons-react';
import { AppHeader } from '../components/AppHeader';
import { fetchBySiteId } from '../lib/api';
import { statusLabel } from '../lib/types';
import type { QueueEntry, QueueStatus } from '../lib/types';
import { slaLabel } from '../lib/duration';

const tagType: Record<QueueStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  waiting: 'gray',
  in_review: 'blue',
  approved: 'green',
  rejected: 'red',
};

function currentStep(status: QueueStatus): number {
  switch (status) {
    case 'waiting':
      return 0;
    case 'in_review':
      return 1;
    case 'approved':
    case 'rejected':
      return 2;
  }
}

export default function StatusPage() {
  const { siteId = '' } = useParams<{ siteId: string }>();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let firstLoad = true;
    const load = () => {
      fetchBySiteId(siteId)
        .then((result) => {
          if (!mounted) return;
          setEntries(result.entries);
          setPosition(result.position);
        })
        .catch(() => mounted && setError('Erro ao buscar status.'))
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
  }, [siteId]);

  const latest = entries[0];

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main" style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link to="/">
            <Button kind="ghost" renderIcon={ArrowLeft} size="sm">
              Voltar
            </Button>
          </Link>
        </div>

        <Tile className="checkin-card" style={{ maxWidth: '100%' }}>
          <div className="field-label">SITE ID</div>
          <h1 className="checkin-title mono" style={{ fontSize: '1.75rem' }}>
            {siteId}
          </h1>

          {loading && (
            <div style={{ position: 'relative', minHeight: 120 }}>
              <Loading withOverlay={false} />
            </div>
          )}

          {error && <InlineNotification kind="error" lowContrast title="Erro" subtitle={error} />}

          {!loading && !latest && (
            <InlineNotification
              kind="info"
              lowContrast
              title="Nenhuma solicitação encontrada"
              subtitle={`Não localizamos solicitações para o SITE ID "${siteId}".`}
              hideCloseButton
            />
          )}

          {latest && (
            <Stack gap={6}>
              <div>
                <div className="field-label">Status atual</div>
                <Tag type={tagType[latest.status]} size="md">
                  {statusLabel[latest.status]}
                </Tag>
              </div>
              {position !== null && (
                <div>
                  <div className="field-label">Posição na fila</div>
                  <div
                    className="mono"
                    style={{ fontSize: '1.75rem', fontWeight: 300 }}
                  >
                    #{position}
                  </div>
                </div>
              )}

              {latest.status !== 'waiting' &&
                (() => {
                  const { wait, service, total } = slaLabel(latest);
                  return (
                    <div className="detail-grid" style={{ marginTop: '0.5rem' }}>
                      <div>
                        <div className="field-label">Espera</div>
                        <div className="mono" style={{ fontSize: '0.875rem' }}>
                          {wait}
                        </div>
                      </div>
                      {service && (
                        <div>
                          <div className="field-label">Atendimento</div>
                          <div className="mono" style={{ fontSize: '0.875rem' }}>
                            {service}
                          </div>
                        </div>
                      )}
                      {total && (
                        <div>
                          <div className="field-label">Total</div>
                          <div className="mono" style={{ fontSize: '0.875rem' }}>
                            {total}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              <ProgressIndicator currentIndex={currentStep(latest.status)} spaceEqually>
                <ProgressStep label="Na Fila" description="Aguardando análise" />
                <ProgressStep label="Em Análise" description="Sendo revisado" />
                <ProgressStep
                  label={latest.status === 'rejected' ? 'Recusado' : 'Concluído'}
                  description={
                    latest.status === 'rejected'
                      ? 'Solicitação recusada'
                      : 'Análise finalizada'
                  }
                  invalid={latest.status === 'rejected'}
                />
              </ProgressIndicator>

              <div className="detail-grid">
                <div>
                  <div className="field-label">Protocolo</div>
                  <div className="mono" style={{ fontSize: '1rem' }}>
                    #{latest.protocol}
                  </div>
                </div>
                <div>
                  <div className="field-label">Nome do Técnico</div>
                  <div>{latest.technician_name}</div>
                </div>
                <div>
                  <div className="field-label">Tipo de Solicitação</div>
                  <div>{latest.request_type}</div>
                </div>
                <div>
                  <div className="field-label">Registrado em</div>
                  <div>{new Date(latest.created_at).toLocaleString('pt-BR')}</div>
                </div>
              </div>
            </Stack>
          )}
        </Tile>

        {entries.length > 1 && (
          <Tile className="checkin-card" style={{ maxWidth: '100%', marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1rem', margin: '0 0 1rem' }}>
              Histórico de solicitações deste SITE ID
            </h2>
            <Stack gap={3}>
              {entries.slice(1).map((e) => (
                <div key={e.id} className="history-row">
                  <span className="mono">#{e.protocol}</span>
                  <span>{e.request_type}</span>
                  <Tag type={tagType[e.status]}>{statusLabel[e.status]}</Tag>
                  <span style={{ color: '#525252', fontSize: '0.875rem' }}>
                    {new Date(e.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </Stack>
          </Tile>
        )}
      </main>
    </div>
  );
}
