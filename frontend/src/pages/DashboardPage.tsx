import { useEffect, useState } from 'react';
import { Grid, Column, InlineNotification, Loading, Tag, Tile } from '@carbon/react';
import { fetchDashboard } from '../lib/api';
import type { DashboardData } from '../lib/types';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { slaLabel } from '../lib/duration';
import { statusTagType } from '../lib/status';
import { statusLabel } from '../lib/types';
import type { QueueEntry } from '../lib/types';

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Tile className="stat-card">
      <div className="stat-value" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </Tile>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setData(await fetchDashboard());
      setError(null);
    } catch {
      setError('Erro ao carregar dashboard.');
    }
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, []);

  useQueueEvents(() => {
    void refresh();
  });

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">Visão geral das solicitações.</p>
        </div>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Erro"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
        />
      )}

      {loading ? (
        <div style={{ position: 'relative', minHeight: 200 }}>
          <Loading withOverlay={false} />
        </div>
      ) : data ? (
        <>
          <Grid narrow style={{ marginBottom: '1.5rem' }}>
            <Column sm={2} md={4} lg={4}>
              <StatCard label="Total" value={data.total} />
            </Column>
            <Column sm={2} md={4} lg={4}>
              <StatCard label="Aguardando" value={data.waiting} />
            </Column>
            <Column sm={2} md={4} lg={4}>
              <StatCard label="Em análise" value={data.inReview} tone="#0f62fe" />
            </Column>
            <Column sm={2} md={4} lg={4}>
              <StatCard label="Aprovados" value={data.approved} tone="#24a148" />
            </Column>
            <Column sm={2} md={4} lg={4}>
              <StatCard label="Recusados" value={data.rejected} tone="#da1e28" />
            </Column>
            <Column sm={2} md={4} lg={4}>
              <StatCard
                label="Espera média"
                value={data.avgWaitMin > 0 ? `${data.avgWaitMin} min` : '-'}
              />
            </Column>
            <Column sm={2} md={4} lg={4}>
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
              <p className="muted">Nenhuma solicitação recente.</p>
            ) : (
              <div>
                {data.recent.map((entry: QueueEntry) => {
                  const { wait, service } = slaLabel(entry);
                  return (
                    <div key={entry.id} className="history-row">
                      <span className="mono" style={{ minWidth: 100 }}>
                        #{entry.protocol}
                      </span>
                      <span className="mono" style={{ minWidth: 120 }}>
                        {entry.site_id}
                      </span>
                      <span style={{ minWidth: 100 }}>{entry.technician_name}</span>
                      <Tag type={statusTagType[entry.status]} size="sm">
                        {statusLabel[entry.status]}
                      </Tag>
                      <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.875rem' }}>
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
    </div>
  );
}
