import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { fetchDashboard } from '../lib/api';
import type { DashboardData } from '../lib/types';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { slaLabel } from '../lib/duration';
import { statusChipColor } from '../lib/status';
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
    <Paper variant="outlined" className="stat-card">
      <div className="stat-value" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </Paper>
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
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 200 }}>
          <CircularProgress size={32} />
        </Box>
      ) : data ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Total" value={data.total} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Aguardando" value={data.waiting} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Em análise" value={data.inReview} tone="#0f62fe" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Aprovados" value={data.approved} tone="#24a148" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Recusados" value={data.rejected} tone="#da1e28" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard
                label="Espera média"
                value={data.avgWaitMin > 0 ? `${data.avgWaitMin} min` : '-'}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard
                label="Atendimento médio"
                value={data.avgServiceMin > 0 ? `${data.avgServiceMin} min` : '-'}
              />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 3 }}>
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
                      <Chip
                        size="small"
                        color={statusChipColor[entry.status]}
                        label={statusLabel[entry.status]}
                      />
                      <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.875rem' }}>
                        {wait}
                        {service ? ` / ${service}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Paper>
        </>
      ) : null}
    </div>
  );
}
