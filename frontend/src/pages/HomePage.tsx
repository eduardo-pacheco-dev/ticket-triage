import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ArrowRightIcon from '@mui/icons-material/ArrowForward';
import RestartIcon from '@mui/icons-material/RotateLeftOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { PublicHeader } from '../components/PublicHeader';
import { createCheckIn, fetchRequestTypes } from '../lib/api';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { createCheckInSchema } from '@ticket-triage/shared';
import { zodFieldErrors } from '../lib/schemas';
import { statusLabel } from '../lib/types';
import type { QueueEntry, RequestType } from '../lib/types';

export default function HomePage() {
  const navigate = useNavigate();

  const [siteId, setSiteId] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [types, setTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [checkedIn, setCheckedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchSiteId, setSearchSiteId] = useState('');

  useEffect(() => {
    fetchRequestTypes()
      .then(setTypes)
      .catch(() => {});
  }, []);

  useQueueEvents((payload) => {
    if (payload.type === 'request_types') {
      fetchRequestTypes()
        .then(setTypes)
        .catch(() => {});
    }
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = createCheckInSchema.safeParse({
      site_id: siteId,
      technician_name: technicianName,
      request_type: requestType?.name ?? '',
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    if (!checkedIn) {
      setShowModal(true);
      return;
    }
    setLoading(true);
    try {
      const created = await createCheckIn({
        site_id: parsed.data.site_id,
        technician_name: parsed.data.technician_name,
        request_type: parsed.data.request_type,
      });
      setEntry(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar na fila.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setEntry(null);
    setSiteId('');
    setTechnicianName('');
    setRequestType(null);
    setCheckedIn(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchSiteId.trim()) return;
    navigate(`/status/${encodeURIComponent(searchSiteId.trim())}`);
  }

  return (
    <div className="app-shell">
      <PublicHeader />
      <main className="app-main">
        <Grid container spacing={4} justifyContent="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper className="checkin-card">
              <h1 className="checkin-title">Solicitar Avaliação</h1>
              <p className="checkin-subtitle">
                Preencha os dados abaixo para entrar na fila de análise. Um número de protocolo será
                gerado.
              </p>

              {!entry ? (
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <Stack spacing={3}>
                    {error && (
                      <Alert severity="error" variant="outlined">
                        <strong>Não foi possível prosseguir.</strong> {error}
                      </Alert>
                    )}
                    <TextField
                      id="site_id"
                      label="SITE ID"
                      placeholder="Ex.: SITE-0421"
                      value={siteId}
                      onChange={(e) => setSiteId(e.target.value.toUpperCase())}
                      error={!!fieldErrors.site_id}
                      helperText={fieldErrors.site_id}
                      required
                      fullWidth
                    />
                    <TextField
                      id="technician_name"
                      label="Nome do Técnico"
                      placeholder="Ex.: Francisco Silva"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value.toUpperCase())}
                      error={!!fieldErrors.technician_name}
                      helperText={fieldErrors.technician_name}
                      required
                      fullWidth
                    />
                    <Autocomplete
                      id="request_type"
                      options={types}
                      getOptionKey={(option) => option.id}
                      getOptionLabel={(option: RequestType) => option.name}
                      value={requestType}
                      onChange={(_, newValue) => setRequestType(newValue ?? null)}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tipo de Solicitação"
                          placeholder="Selecione um tipo"
                          error={!!fieldErrors.request_type}
                          helperText={
                            fieldErrors.request_type ?? 'Selecione um tipo da lista'
                          }
                        />
                      )}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          id="checkin_confirm"
                          checked={checkedIn}
                          onChange={(e) => setCheckedIn(e.target.checked)}
                        />
                      }
                      label="Realizado Check-in e QCP3"
                    />
                    <Button
                      type="submit"
                      disabled={loading}
                      endIcon={<ArrowRightIcon />}
                      size="large"
                    >
                      {loading ? 'Registrando...' : 'Solicitar Avaliação'}
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Stack spacing={3}>
                  <Alert severity="success" variant="outlined">
                    <strong>Solicitação registrada com sucesso!</strong> Guarde seu número de
                    protocolo e SITE ID para acompanhamento.
                  </Alert>
                  <div>
                    <div className="field-label">Protocolo</div>
                    <div className="protocol-code">#{entry.protocol}</div>
                  </div>
                  <div>
                    <div className="field-label">SITE ID</div>
                    <div className="mono" style={{ fontSize: '1rem' }}>
                      {entry.site_id}
                    </div>
                  </div>
                  <div>
                    <div className="field-label">Status atual</div>
                    <Chip color="primary" label={statusLabel[entry.status]} />
                  </div>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      startIcon={<SearchIcon />}
                      onClick={() => navigate(`/status/${encodeURIComponent(entry.site_id)}`)}
                    >
                      Ver acompanhamento
                    </Button>
                    <Button variant="outlined" startIcon={<RestartIcon />} onClick={reset}>
                      Nova solicitação
                    </Button>
                  </Box>
                </Stack>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper className="checkin-card">
              <h2 className="checkin-title" style={{ fontSize: '1.5rem' }}>
                Acompanhar Status
              </h2>
              <p className="checkin-subtitle">
                Já solicitou uma avaliação? Consulte o andamento pelo SITE ID.
              </p>
              <Box component="form" onSubmit={handleSearch} noValidate>
                <Stack spacing={3}>
                  <TextField
                    id="search_site_id"
                    label="SITE ID"
                    placeholder="Ex.: SITE-0421"
                    value={searchSiteId}
                    onChange={(e) => setSearchSiteId(e.target.value.toUpperCase())}
                    required
                    fullWidth
                  />
                  <Button type="submit" variant="outlined" startIcon={<SearchIcon />} size="large">
                    Buscar Status
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </main>

      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Check-in obrigatório</DialogTitle>
        <DialogContent>
          <p style={{ marginBottom: '1rem' }}>
            É necessário realizar o <strong>Check-in</strong> e o <strong>QCP3</strong> antes de
            solicitar a avaliação.
          </p>
          <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Certifique-se de que ambos os procedimentos foram concluídos e marque a opção no
            formulário.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Entendi</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
