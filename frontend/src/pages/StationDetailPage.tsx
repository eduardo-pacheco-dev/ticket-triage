import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowLeftIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/EditOutlined';
import { fetchStation } from '../lib/api';
import type { Station } from '../lib/types';

function fmtDate(v: Date | string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </div>
  );
}

function DateField({ label, value }: { label: string; value: Date | string | null }) {
  return (
    <div>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="body2">{fmtDate(value)}</Typography>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}

export default function StationDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchStation(id)
      .then(setStation)
      .catch(() => setError('Erro ao carregar estação.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <Button component={Link} to="/admin/estacoes" startIcon={<ArrowLeftIcon />} size="small">
          Voltar para estações
        </Button>
      </div>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 200 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Erro.</strong> {error}
        </Alert>
      )}

      {station && (
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
          >
            <Box>
              <h1 className="admin-title" style={{ marginBottom: 0 }}>
                {station.name}
              </h1>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                <span className="mono">{station.code}</span>
                {station.siteId && station.siteId !== station.code && (
                  <>
                    {' '}
                    · Site ID: <span className="mono">{station.siteId}</span>
                  </>
                )}
              </Typography>
            </Box>
            <Button
              component={Link}
              to={`/admin/estacoes`}
              startIcon={<EditIcon />}
              variant="outlined"
              size="small"
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              Editar
            </Button>
          </Stack>

          {station.status && (
            <Chip
              label={station.status}
              color={station.status.toLowerCase().includes('desativ') ? 'default' : 'primary'}
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Section title="Dados gerais">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Nome" value={station.name} />
                  <Field label="Código" value={station.code} />
                  <Field label="Site ID" value={station.siteId} />
                  <Field label="Station ID" value={station.stationId} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Tipo de elemento" value={station.elementType} />
                  <Field label="Tecnologia" value={station.technology} />
                  <Field label="Tipo de conexão" value={station.connectionType} />
                  <Field label="Classificação" value={station.classification} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Regional" value={station.regional} />
                  <Field label="Situação" value={station.situation} />
                  <Field label="Ordem complexa" value={station.complexOrder} />
                  <Field label="OTs" value={station.ots} />
                </Stack>
              </Section>

              <Divider />

              <Section title="Datas">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DateField label="Aquisição" value={station.acquisitionDate} />
                  <DateField label="Construção" value={station.constructionDate} />
                  <DateField label="Ativação" value={station.activationDate} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DateField label="Desativação" value={station.deactivationDate} />
                  <DateField label="Cancelamento" value={station.cancellationDate} />
                </Stack>
              </Section>

              <Divider />

              <Section title="Endereço">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Tipo de logradouro" value={station.streetType} />
                  <Field label="Logradouro" value={station.street} />
                  <Field label="Número" value={station.number} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Complemento" value={station.complement} />
                  <Field label="Bairro" value={station.neighborhood} />
                  <Field label="CEP" value={station.zipCode} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Município" value={station.city} />
                  <Field label="UF" value={station.state} />
                  <Field label="Endereço (legado)" value={station.address} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Endereço ID" value={station.addressId} />
                  <Field label="Latitude" value={station.latitude} />
                  <Field label="Longitude" value={station.longitude} />
                </Stack>
              </Section>

              <Divider />

              <Section title="Contratos e infraestrutura">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Tipo contrato área" value={station.areaContractType} />
                  <Field label="Detentor da área" value={station.areaHolder} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Tipo contrato infra" value={station.infraContractType} />
                  <Field label="Detentor de infra" value={station.infraHolder} />
                  <Field label="Tipo de infra" value={station.infraType} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Tipo de EV" value={station.evType} />
                  <Field label="Fornecedor de EV" value={station.evProvider} />
                </Stack>
              </Section>

              <Divider />

              <Section title="Torre e estrutura">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Tipo da torre" value={station.towerType} />
                  <Field label="AEV Nominal" value={station.aevNominal} />
                  <Field label="Área de solo" value={station.groundArea} />
                  <Field label="Altura da estrutura" value={station.structureHeight} />
                </Stack>
              </Section>

              <Divider />

              <Section title="Observações">
                <Field label="Observação" value={station.observation} />
                <Field label="Justificativa" value={station.justification} />
                <Field label="Observação THQ" value={station.thqObservation} />
              </Section>

              <Divider />

              <Section title="Contato">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <Field label="Telefone" value={station.phone} />
                  <Field label="E-mail" value={station.email} />
                  <Field label="Responsável" value={station.responsible} />
                </Stack>
                <Field label="Observações gerais" value={station.notes} />
              </Section>

              <Divider />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <DateField label="Criado em" value={station.createdAt} />
                <DateField label="Atualizado em" value={station.updatedAt} />
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      )}
    </>
  );
}
