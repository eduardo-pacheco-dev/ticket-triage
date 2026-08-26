import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowLeftIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import {
  fetchBulkStationsCount,
  fetchBulkStationJob,
  uploadBulkStationsExcel,
  downloadBulkStationsExcel,
  deleteAllBulkStations,
  ApiError,
} from '../lib/api';
import { useToastStore } from '../stores/toast';
import type { ImportJob } from '../lib/types';

export default function BulkStationsPage() {
  const notify = useToastStore((s) => s.notify);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCount = useCallback(async () => {
    try {
      const { count } = await fetchBulkStationsCount();
      setTotalCount(count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contagem.');
    }
  }, []);

  useEffect(() => {
    void loadCount().finally(() => setLoading(false));
  }, [loadCount]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const job = await uploadBulkStationsExcel(file);
      setActiveJob(job);
      pollJob(job.id);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Erro ao importar planilha.');
      }
      setUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function pollJob(jobId: string) {
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let attempts = 0;
    const maxAttempts = 1800;

    while (attempts < maxAttempts) {
      await delay(attempts < 20 ? 1000 : 3000);
      attempts++;
      try {
        const job = await fetchBulkStationJob(jobId);
        setActiveJob(job);
        if (job.status === 'completed' || job.status === 'failed') {
          setUploading(false);
          if (job.status === 'completed') {
            const parts: string[] = [];
            if (job.inserted) parts.push(`${job.inserted} inseridos`);
            if (job.skipped) parts.push(`${job.skipped} ignorados (duplicados)`);
            if (job.errors) parts.push(`${job.errors} erros`);
            notify({
              kind: job.errors > 0 ? 'warning' : 'success',
              title: parts.length > 0 ? parts.join(', ') : 'Importação concluída.',
            });
          } else {
            notify({ kind: 'error', title: 'Falha na importação.' });
          }
          await loadCount();
          return;
        }
      } catch {
        break;
      }
    }
    setUploading(false);
    setError('Tempo limite de processamento excedido.');
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadBulkStationsExcel();
    } catch {
      setError('Erro ao exportar dados.');
    } finally {
      setExporting(false);
    }
  }

  async function handleClearAll() {
    setError(null);
    try {
      await deleteAllBulkStations();
      notify({ kind: 'success', title: 'Todos os registros foram removidos.' });
      setPendingClear(false);
      await loadCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao limpar registros.');
      setPendingClear(false);
    }
  }

  return (
    <div className="admin-page">
      <div style={{ marginBottom: '1rem' }}>
        <Button component={Link} to="/admin" startIcon={<ArrowLeftIcon />} size="small">
          Voltar para a fila
        </Button>
      </div>

      <h1 className="admin-title">Estações (Importação em Massa)</h1>
      <p className="admin-subtitle" style={{ marginBottom: '1.5rem' }}>
        Importe e exporte dados de estações de telecomunicação via planilha Excel.
      </p>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontSize="1rem" fontWeight={600}>
                Registros no banco
              </Typography>
              <Typography variant="h4" fontWeight={700} color="primary">
                {loading ? '...' : (totalCount?.toLocaleString('pt-BR') ?? '0')}
              </Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={handleFileChange}
            />
            <Button
              variant="contained"
              startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Importando...' : 'Importar Excel'}
            </Button>
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
              disabled={exporting || totalCount === 0}
              onClick={() => void handleExport()}
            >
              {exporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              disabled={totalCount === 0}
              onClick={() => setPendingClear(true)}
            >
              Limpar dados
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {activeJob && (activeJob.status === 'pending' || activeJob.status === 'processing') && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight={600}>
                Importando estações...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeJob.processed.toLocaleString('pt-BR')} /{' '}
                {activeJob.total.toLocaleString('pt-BR')} (
                {activeJob.total > 0
                  ? Math.round((activeJob.processed / activeJob.total) * 100)
                  : 0}
                %)
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={activeJob.total > 0 ? (activeJob.processed / activeJob.total) * 100 : 0}
              color={activeJob.errors > 0 ? 'warning' : 'primary'}
            />
            {activeJob.inserted !== undefined && activeJob.processed > 0 && (
              <Stack direction="row" spacing={2}>
                <Typography variant="body2" color="success.main">
                  Inseridos: {activeJob.inserted.toLocaleString('pt-BR')}
                </Typography>
                {activeJob.skipped !== undefined && activeJob.skipped > 0 && (
                  <Typography variant="body2" color="warning.main">
                    Ignorados: {activeJob.skipped.toLocaleString('pt-BR')}
                  </Typography>
                )}
                {activeJob.errors > 0 && (
                  <Typography variant="body2" color="error.main">
                    Erros: {activeJob.errors.toLocaleString('pt-BR')}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>
      )}

      <Dialog open={pendingClear} onClose={() => setPendingClear(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Limpar dados de estações</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover <strong>todos</strong> os registros de estações
            importados? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingClear(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => void handleClearAll()}>
            Limpar tudo
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
