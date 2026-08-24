import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { AdminTable } from '../components/AdminTable';
import type { AdminColumn } from '../components/AdminTable';
import { fetchActiveQueue, updateStatus } from '../lib/api';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { useToastStore } from '../stores/toast';
import { showDesktopNotification } from '../lib/notifications';
import { statusLabel } from '../lib/types';
import type { QueueEntry, QueueStatus } from '../lib/types';
import { formatEntryTime, slaLabel } from '../lib/duration';
import { statusChipColor } from '../lib/status';

function waitMinutes(entry: QueueEntry): number {
  const start = new Date(entry.created_at).getTime();
  const end = new Date(entry.started_at ?? entry.updated_at).getTime();
  return Math.max(0, Math.floor((end - start) / 60000));
}

export default function AdminQueuePage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [rejectTarget, setRejectTarget] = useState<QueueEntry | null>(null);

  const notify = useToastStore((s) => s.notify);

  async function refresh() {
    try {
      setEntries(await fetchActiveQueue());
    } catch {
      setError('Erro ao carregar fila.');
    }
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, []);

  useQueueEvents((payload) => {
    void refresh();
    const label = [payload.protocol ? `#${payload.protocol}` : '', payload.site_id ?? '']
      .filter(Boolean)
      .join(' · ');
    if (payload.action === 'created') {
      notify({ kind: 'success', title: 'Nova solicitação recebida', subtitle: label });
      showDesktopNotification('Nova solicitação recebida', label);
    } else if (payload.status === 'in_review') {
      notify({ kind: 'info', title: 'Solicitação em análise', subtitle: label });
    } else if (payload.status === 'approved') {
      notify({ kind: 'success', title: 'Solicitação aprovada', subtitle: label });
    } else if (payload.status === 'rejected') {
      notify({ kind: 'error', title: 'Solicitação recusada', subtitle: label });
    }
  });

  async function handleUpdate(id: string, status: QueueStatus) {
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await updateStatus(id, status);
      await refresh();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar.');
    } finally {
      setPending((p) => ({ ...p, [id]: false }));
    }
  }

  const positions = useMemo(() => {
    const active = entries.filter((e) => e.status === 'waiting' || e.status === 'in_review');
    return new Map(active.map((e, i) => [e.id, i + 1]));
  }, [entries]);

  const stats = useMemo(
    () => ({
      waiting: entries.filter((e) => e.status === 'waiting').length,
      in_review: entries.filter((e) => e.status === 'in_review').length,
    }),
    [entries],
  );

  const columns: AdminColumn<QueueEntry>[] = [
    {
      key: 'position',
      header: 'Posição',
      sortable: true,
      sortValue: (row) => positions.get(row.id) ?? 0,
      render: (row) => `#${positions.get(row.id) ?? '-'}`,
    },
    {
      key: 'site_id',
      header: 'SITE ID',
      sortable: true,
      render: (row) => <span className="mono">{row.site_id}</span>,
      value: (row) => row.site_id,
    },
    { key: 'technician_name', header: 'Nome do Técnico', sortable: true },
    { key: 'request_type', header: 'Tipo', sortable: true },
    {
      key: 'protocol',
      header: 'Protocolo',
      sortable: true,
      render: (row) => <span className="mono">#{row.protocol}</span>,
      value: (row) => row.protocol,
    },
    {
      key: 'created_at',
      header: 'Entrada',
      sortable: true,
      sortValue: (row) => new Date(row.created_at).getTime(),
      render: (row) => <span className="muted">{formatEntryTime(row.created_at)}</span>,
    },
    {
      key: 'sla',
      header: 'Espera (SLA)',
      sortable: true,
      sortValue: waitMinutes,
      render: (row) => <span className="muted">{slaLabel(row).wait}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Chip size="small" color={statusChipColor[row.status]} label={statusLabel[row.status]} />
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => {
        const busy = !!pending[row.id];
        if (row.status === 'waiting') {
          return (
            <Button
              size="small"
              variant="contained"
              startIcon={<PlayArrowIcon />}
              disabled={busy}
              onClick={() => void handleUpdate(row.id, 'in_review')}
            >
              Chamar
            </Button>
          );
        }
        if (row.status === 'in_review') {
          return (
            <Box className="row-actions">
              <Button
                size="small"
                variant="contained"
                startIcon={<CheckCircleIcon />}
                disabled={busy}
                onClick={() => void handleUpdate(row.id, 'approved')}
              >
                Concluir
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                disabled={busy}
                onClick={() => setRejectTarget(row)}
              >
                Recusar
              </Button>
            </Box>
          );
        }
        return <span className="muted">-</span>;
      },
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Fila de Análise de Documentos</h1>
          <p className="admin-subtitle">
            Solicitações em ordem de chegada (FIFO). Atualização em tempo real.
          </p>
        </div>
        <div className="admin-chips">
          <Chip size="small" color="default" label={`Aguardando: ${stats.waiting}`} />
          <Chip size="small" color="primary" label={`Em análise: ${stats.in_review}`} />
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
      ) : (
        <AdminTable
          title="Solicitações"
          description={`${entries.length} solicitação(ões) na fila ativa`}
          columns={columns}
          rows={entries}
          getRowKey={(row) => row.id}
          searchFields={(row) => [row.site_id, row.technician_name, row.protocol]}
          searchPlaceholder="Buscar por SITE ID, técnico ou protocolo"
          emptyMessage="Nenhuma solicitação na fila ainda."
        />
      )}

      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Recusar solicitação</DialogTitle>
        <DialogContent>
          <DialogContentText component="div" gutterBottom>
            Confirma recusar a solicitação{' '}
            <strong className="mono">#{rejectTarget?.protocol}</strong>?
          </DialogContentText>
          <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            SITE ID {rejectTarget?.site_id} · técnico {rejectTarget?.technician_name}. A solicitação
            será arquivada como recusada e poderá ser reaberta em "Arquivados".
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              const target = rejectTarget;
              setRejectTarget(null);
              if (target) void handleUpdate(target.id, 'rejected');
            }}
          >
            Recusar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
