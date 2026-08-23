import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
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
import {
  PlayFilledAlt,
  CheckmarkFilled,
  CloseFilled,
  Settings,
  Document,
} from '@carbon/icons-react';
import { AppHeader } from '../components/AppHeader';
import { fetchActiveQueue, updateStatus } from '../lib/api';
import { statusLabel } from '../lib/types';
import type { QueueEntry, QueueStatus } from '../lib/types';
import { slaLabel } from '../lib/duration';

const statusTagType: Record<QueueStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  waiting: 'gray',
  in_review: 'blue',
  approved: 'green',
  rejected: 'red',
};

function formatTime(iso: string | Date) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Row {
  id: string;
  position: string;
  site_id: string;
  technician_name: string;
  request_type: string;
  protocol: string;
  time: string;
  sla: string;
  statusRaw: QueueStatus;
  entry: QueueEntry;
}

const headers = [
  { key: 'position', header: 'Posição' },
  { key: 'site_id', header: 'SITE ID' },
  { key: 'technician_name', header: 'Nome do Técnico' },
  { key: 'request_type', header: 'Tipo' },
  { key: 'protocol', header: 'Protocolo' },
  { key: 'time', header: 'Entrada' },
  { key: 'sla', header: 'SLA' },
  { key: 'statusRaw', header: 'Status' },
  { key: 'actions', header: 'Ações' },
];

export default function AdminQueuePage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    let firstLoad = true;
    const load = () => {
      fetchActiveQueue()
        .then((rows) => mounted && setEntries(rows))
        .catch(() => mounted && setError('Erro ao carregar fila.'))
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
  }, []);

  async function handleUpdate(id: string, status: QueueStatus) {
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await updateStatus(id, status);
      const rows = await fetchActiveQueue();
      setEntries(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar.');
    } finally {
      setPending((p) => ({ ...p, [id]: false }));
    }
  }

  const activeQueue = useMemo(
    () => entries.filter((e) => e.status === 'waiting' || e.status === 'in_review'),
    [entries],
  );

  const rows: Row[] = entries.map((e) => {
    const activeIdx = activeQueue.findIndex((a) => a.id === e.id);
    const { wait } = slaLabel(e);
    return {
      id: e.id,
      position: `#${activeIdx + 1}`,
      site_id: e.site_id,
      technician_name: e.technician_name,
      request_type: e.request_type,
      protocol: e.protocol,
      time: formatTime(e.created_at),
      sla: wait,
      statusRaw: e.status,
      entry: e,
    };
  });

  const stats = {
    waiting: entries.filter((e) => e.status === 'waiting').length,
    in_review: entries.filter((e) => e.status === 'in_review').length,
    approved: entries.filter((e) => e.status === 'approved').length,
    rejected: entries.filter((e) => e.status === 'rejected').length,
  };

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main" style={{ maxWidth: 1400 }}>
        <div className="admin-header-row">
          <div>
            <h1 className="admin-title">Fila de Análise de Documentos</h1>
            <p className="admin-subtitle">
              Solicitações em ordem de chegada (FIFO). Atualização em tempo real.
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Tag type="gray">Aguardando: {stats.waiting}</Tag>
            <Tag type="blue">Em análise: {stats.in_review}</Tag>
            <Tag type="green">Aprovados: {stats.approved}</Tag>
            <Tag type="red">Recusados: {stats.rejected}</Tag>
            <Link to="/admin/arquivados">
              <Button kind="ghost" size="sm" renderIcon={Document}>
                Arquivados
              </Button>
            </Link>
            <Link to="/admin/configuracoes">
              <Button kind="tertiary" size="sm" renderIcon={Settings}>
                Configurações
              </Button>
            </Link>
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
        ) : (
          <DataTable rows={rows} headers={headers} isSortable>
            {({ rows: r, headers: h, getHeaderProps, getRowProps, getTableProps, onInputChange }) => (
              <TableContainer
                title="Solicitações"
                description={`${entries.length} solicitação(ões) no total`}
              >
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      onChange={(e) =>
                        onInputChange(e as React.ChangeEvent<HTMLInputElement>)
                      }
                      placeholder="Buscar por SITE ID, técnico ou protocolo"
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
                            if (cell.info.header === 'site_id') {
                              return (
                                <TableCell key={cell.id}>
                                  <span className="mono">{cell.value as string}</span>
                                </TableCell>
                              );
                            }
                            if (cell.info.header === 'protocol') {
                              return (
                                <TableCell key={cell.id}>
                                  <span className="mono">#{cell.value as string}</span>
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
                                  <Tag type={statusTagType[entry.status]}>
                                    <span
                                      className={
                                        entry.status === 'waiting'
                                          ? 'status-tag-waiting'
                                          : entry.status === 'in_review'
                                            ? 'status-tag-review'
                                            : entry.status === 'approved'
                                              ? 'status-tag-approved'
                                              : 'status-tag-rejected'
                                      }
                                    >
                                      {statusLabel[entry.status]}
                                    </span>
                                  </Tag>
                                </TableCell>
                              );
                            }
                            if (cell.info.header === 'actions') {
                              return (
                                <TableCell key={cell.id}>
                                  <div className="row-actions">
                                    {entry.status === 'waiting' && (
                                      <Button
                                        size="sm"
                                        kind="primary"
                                        renderIcon={PlayFilledAlt}
                                        disabled={busy}
                                        onClick={() => handleUpdate(entry.id, 'in_review')}
                                      >
                                        Chamar
                                      </Button>
                                    )}
                                    {entry.status === 'in_review' && (
                                      <>
                                        <Button
                                          size="sm"
                                          kind="primary"
                                          renderIcon={CheckmarkFilled}
                                          disabled={busy}
                                          onClick={() => handleUpdate(entry.id, 'approved')}
                                        >
                                          Concluir
                                        </Button>
                                        <Button
                                          size="sm"
                                          kind="danger--tertiary"
                                          renderIcon={CloseFilled}
                                          disabled={busy}
                                          onClick={() => handleUpdate(entry.id, 'rejected')}
                                        >
                                          Recusar
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            }
                            return <TableCell key={cell.id}>{String(cell.value ?? '')}</TableCell>;
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
                          Nenhuma solicitação na fila ainda.
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
