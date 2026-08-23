import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Button,
  Tag,
  InlineNotification,
  Loading,
} from '@carbon/react';
import { Restart, ArrowLeft } from '@carbon/icons-react';
import { AppHeader } from '../components/AppHeader';
import { fetchArchivedQueue, updateStatus } from '../lib/api';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { statusLabel } from '../lib/types';
import type { QueueEntry } from '../lib/types';
import { slaLabel } from '../lib/duration';

interface Row {
  id: string;
  protocol: string;
  site_id: string;
  technician_name: string;
  request_type: string;
  statusRaw: string;
  sla: string;
  updated_at: string;
  entry: QueueEntry;
}

const headers = [
  { key: 'protocol', header: 'Protocolo' },
  { key: 'site_id', header: 'SITE ID' },
  { key: 'technician_name', header: 'Técnico' },
  { key: 'request_type', header: 'Tipo' },
  { key: 'statusRaw', header: 'Status' },
  { key: 'sla', header: 'SLA' },
  { key: 'updated_at', header: 'Concluído em' },
  { key: 'actions', header: 'Ações' },
];

function formatDate(iso: string | Date) {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function ArchivedPage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchArchivedQueue()
      .then(setEntries)
      .catch(() => setError('Erro ao carregar arquivados.'))
      .finally(() => setLoading(false));
  }, []);

  useQueueEvents(() => {
    fetchArchivedQueue()
      .then(setEntries)
      .catch(() => {});
  });

  async function handleReopen(id: string) {
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await updateStatus(id, 'waiting');
      const rows = await fetchArchivedQueue();
      setEntries(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reabrir.');
    } finally {
      setPending((p) => ({ ...p, [id]: false }));
    }
  }

  const rows: Row[] = entries.map((e) => {
    const { wait, service, total } = slaLabel(e);
    return {
      id: e.id,
      protocol: e.protocol,
      site_id: e.site_id,
      technician_name: e.technician_name,
      request_type: e.request_type,
      statusRaw: e.status,
      sla: total || `${wait} / ${service}`,
      updated_at: formatDate(e.updated_at),
      entry: e,
    };
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

        <h1 className="admin-title">Arquivados</h1>
        <p className="admin-subtitle" style={{ marginBottom: '1.5rem' }}>
          Solicitações concluídas (aprovadas ou recusadas).
        </p>

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
        ) : (
          <DataTable rows={rows} headers={headers} isSortable>
            {({ rows: r, headers: h, getHeaderProps, getRowProps, getTableProps, onInputChange }) => (
              <TableContainer
                title="Solicitações arquivadas"
                description={`${entries.length} solicitação(ões) concluída(s)`}
              >
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      onChange={(e) =>
                        onInputChange(e as React.ChangeEvent<HTMLInputElement>)
                      }
                      placeholder="Buscar..."
                    />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {h.map((header) => {
                        const { key: hk, ...hp } = getHeaderProps({ header });
                        return (
                          <TableHeader key={hk} {...hp}>
                            {header.header}
                          </TableHeader>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.map((row) => {
                      const found = rows.find((x) => x.id === row.id);
                      if (!found) return null;
                      const entry = found.entry;
                      const busy = !!pending[entry.id];
                      const { key: rk, ...rp } = getRowProps({ row });
                      return (
                        <TableRow key={rk} {...rp}>
                          {row.cells.map((cell) => {
                            if (cell.info.header === 'protocol') {
                              return (
                                <TableCell key={cell.id}>
                                  <span className="mono">#{cell.value as string}</span>
                                </TableCell>
                              );
                            }
                            if (cell.info.header === 'site_id') {
                              return (
                                <TableCell key={cell.id}>
                                  <span className="mono">{cell.value as string}</span>
                                </TableCell>
                              );
                            }
                            if (cell.info.header === 'sla') {
                              return (
                                <TableCell key={cell.id}>
                                  <span style={{ color: '#525252', fontSize: '0.875rem' }}>
                                    {cell.value as string}
                                  </span>
                                </TableCell>
                              );
                            }
                            if (cell.info.header === 'statusRaw') {
                              return (
                                <TableCell key={cell.id}>
                                  <Tag type={entry.status === 'approved' ? 'green' : 'red'}>
                                    {statusLabel[entry.status]}
                                  </Tag>
                                </TableCell>
                              );
                            }
                            if (cell.info.header === 'actions') {
                              return (
                                <TableCell key={cell.id}>
                                  <Button
                                    size="sm"
                                    kind="ghost"
                                    renderIcon={Restart}
                                    disabled={busy}
                                    onClick={() => handleReopen(entry.id)}
                                  >
                                    Reabrir
                                  </Button>
                                </TableCell>
                              );
                            }
                            return (
                              <TableCell key={cell.id}>{String(cell.value ?? '')}</TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                    {r.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={headers.length}
                          style={{ textAlign: 'center', color: '#525252', padding: '2rem' }}
                        >
                          Nenhuma solicitação arquivada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </main>
    </div>
  );
}
