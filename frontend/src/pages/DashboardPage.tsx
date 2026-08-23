import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Tile, Grid, Column, Loading, Tag, Button, InlineNotification } from '@carbon/react';
import { ArrowLeft } from '@carbon/icons-react';
import { AppHeader } from '../components/AppHeader';
import { fetchDashboard } from '../lib/api';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { slaLabel } from '../lib/duration';
import type { QueueEntry } from '../lib/types';

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Tile style={{ textAlign: 'center', padding: '1.5rem' }}>
      <div style={{ fontSize: '2rem', fontWeight: 300, color: color ?? '#0f62fe' }}>{value}</div>
      <div style={{ fontSize: '0.875rem', color: '#525252', marginTop: '0.25rem' }}>{label}</div>
    </Tile>
  );
}

function statusText(status: string): string {
  switch (status) {
    case 'waiting':
      return 'Aguardando';
    case 'in_review':
      return 'Em análise';
    case 'approved':
      return 'Aprovado';
    default:
      return 'Recusado';
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then((d) => setData(d))
      .catch(() => setError('Erro ao carregar dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  useQueueEvents(() => {
    fetchDashboard()
      .then((d) => setData(d))
      .catch(() => {});
  });

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

        <h1 className="admin-title">Dashboard</h1>
        <p className="admin-subtitle" style={{ marginBottom: '1.5rem' }}>
          Visão geral das solicitações.
        </p>

        {error && <InlineNotification kind="error" lowContrast title="Erro" subtitle={error} />}

        {loading ? (
          <div style={{ position: 'relative', minHeight: 200 }}>
            <Loading withOverlay={false} />
          </div>
        ) : data ? (
          <>
            <Grid narrow style={{ marginBottom: '1.5rem' }}>
              <Column sm={2} md={2} lg={2}>
                <StatCard label="Total" value={data.total} color="#161616" />
              </Column>
              <Column sm={2} md={2} lg={2}>
                <StatCard label="Aguardando" value={data.waiting} color="#6f6f6f" />
              </Column>
              <Column sm={2} md={2} lg={2}>
                <StatCard label="Em análise" value={data.inReview} />
              </Column>
              <Column sm={2} md={2} lg={2}>
                <StatCard label="Aprovados" value={data.approved} color="#24a148" />
              </Column>
              <Column sm={2} md={2} lg={2}>
                <StatCard label="Recusados" value={data.rejected} color="#da1e28" />
              </Column>
              <Column sm={2} md={2} lg={2}>
                <StatCard
                  label="Espera média"
                  value={data.avgWaitMin > 0 ? `${data.avgWaitMin} min` : '-'}
                />
              </Column>
              <Column sm={2} md={2} lg={2}>
                <StatCard
                  label="Atendimento médio"
                  value={data.avgServiceMin > 0 ? `${data.avgServiceMin} min` : '-'}
                />
              </Column>
            </Grid>

            <Tile style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem', fontWeight: 500 }}>
                Últimas solicitações
              </h2>
              {data.recent.length === 0 ? (
                <p style={{ color: '#525252' }}>Nenhuma solicitação recente.</p>
              ) : (
                <div>
                  {data.recent.map((entry: QueueEntry, i: number) => {
                    const { wait, service } = slaLabel(entry);
                    return (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          alignItems: 'center',
                          padding: '0.5rem 0',
                          borderBottom: i < data.recent.length - 1 ? '1px solid #e0e0e0' : 'none',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span className="mono" style={{ minWidth: 100 }}>
                          #{entry.protocol}
                        </span>
                        <span className="mono" style={{ minWidth: 120 }}>
                          {entry.site_id}
                        </span>
                        <span style={{ minWidth: 100 }}>{entry.technician_name}</span>
                        <Tag
                          type={
                            entry.status === 'approved'
                              ? 'green'
                              : entry.status === 'rejected'
                                ? 'red'
                                : entry.status === 'in_review'
                                  ? 'blue'
                                  : 'gray'
                          }
                          size="sm"
                        >
                          {statusText(entry.status)}
                        </Tag>
                        <span
                          style={{
                            color: '#525252',
                            fontSize: '0.875rem',
                            marginLeft: 'auto',
                          }}
                        >
                          {wait}
                          {service ? ` / ${service}` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Tile>
          </>
        ) : null}
      </main>
    </div>
  );
}
