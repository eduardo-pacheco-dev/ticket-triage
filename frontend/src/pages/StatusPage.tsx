import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import ArrowLeftIcon from '@mui/icons-material/ArrowBack';
import { PublicHeader } from '../components/PublicHeader';
import { fetchBySiteId } from '../lib/api';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { statusLabel } from '../lib/types';
import type { PublicQueueEntry, QueueStatus } from '../lib/types';

const chipColor: Record<QueueStatus, 'default' | 'primary' | 'success' | 'error'> = {
  waiting: 'default',
  in_review: 'primary',
  approved: 'success',
  rejected: 'error',
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
  const [entries, setEntries] = useState<PublicQueueEntry[]>([]);
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchBySiteId(siteId)
      .then((result) => {
        setEntries(result.entries);
        setPosition(result.position);
      })
      .catch(() => setError('Erro ao buscar status.'))
      .finally(() => setLoading(false));
  }, [siteId]);

  useQueueEvents((payload) => {
    if (!payload.site_id || payload.site_id === siteId) {
      fetchBySiteId(siteId)
        .then((result) => {
          setEntries(result.entries);
          setPosition(result.position);
        })
        .catch(() => {});
    }
  });

  const latest = entries[0];

  return (
    <div className="app-shell">
      <PublicHeader />
      <main className="app-main" style={{ maxWidth: 900 }}>
        <Box sx={{ mb: 2 }}>
          <Button component={Link} to="/" startIcon={<ArrowLeftIcon />} size="small">
            Voltar
          </Button>
        </Box>

        <Paper className="checkin-card" sx={{ maxWidth: '100%' }}>
          <div className="field-label">SITE ID</div>
          <h1 className="checkin-title mono" style={{ fontSize: '1.75rem' }}>
            {siteId}
          </h1>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 120 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {error && (
            <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !latest && (
            <Alert severity="info" variant="outlined">
              <strong>Nenhuma solicitação encontrada.</strong> Não localizamos solicitações para o
              SITE ID "{siteId}".
            </Alert>
          )}

          {latest && (
            <Stack spacing={3}>
              <div>
                <div className="field-label">Status atual</div>
                <Chip color={chipColor[latest.status]} label={statusLabel[latest.status]} />
              </div>
              {position !== null && (
                <div>
                  <div className="field-label">Posição na fila</div>
                  <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 300 }}>
                    #{position}
                  </div>
                </div>
              )}

              <Stepper activeStep={currentStep(latest.status)} alternativeLabel>
                <Step>
                  <StepLabel>Na Fila</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Em Análise</StepLabel>
                </Step>
                <Step>
                  <StepLabel error={latest.status === 'rejected'}>
                    {latest.status === 'rejected' ? 'Recusado' : 'Concluído'}
                  </StepLabel>
                </Step>
              </Stepper>

              <div className="detail-grid">
                <div>
                  <div className="field-label">Protocolo</div>
                  <div className="mono" style={{ fontSize: '1rem' }}>
                    #{latest.protocol}
                  </div>
                </div>
              </div>
            </Stack>
          )}
        </Paper>

        {entries.length > 1 && (
          <Paper className="checkin-card" sx={{ maxWidth: '100%', mt: 2 }}>
            <h2 style={{ fontSize: '1rem', margin: '0 0 1rem' }}>
              Histórico de solicitações deste SITE ID
            </h2>
            <Stack spacing={1.5}>
              {entries.slice(1).map((e) => (
                <div key={e.protocol} className="history-row">
                  <span className="mono">#{e.protocol}</span>
                  <Chip size="small" color={chipColor[e.status]} label={statusLabel[e.status]} />
                </div>
              ))}
            </Stack>
          </Paper>
        )}
      </main>
    </div>
  );
}
