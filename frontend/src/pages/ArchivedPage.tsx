import { useCallback, useEffect, useState } from 'react';
import { Button, InlineNotification, Loading, Pagination, Tag } from '@carbon/react';
import { Restart } from '@carbon/icons-react';
import { AdminTable } from '../components/AdminTable';
import type { AdminColumn } from '../components/AdminTable';
import { fetchArchivedQueue, updateStatus } from '../lib/api';
import { useQueueEvents } from '../hooks/useQueueEvents';
import { statusLabel } from '../lib/types';
import type { QueueEntry } from '../lib/types';
import { slaLabel } from '../lib/duration';
import { statusTagType } from '../lib/status';

function formatDate(iso: string | Date) {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function ArchivedPage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const load = useCallback(async (p: number, ps: number) => {
    try {
      const result = await fetchArchivedQueue(p, ps);
      setEntries(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar arquivados.');
    }
  }, []);

  useEffect(() => {
    void load(1, 20).finally(() => setLoading(false));
  }, [load]);

  useQueueEvents(() => {
    void load(page, pageSize);
  });

  async function handleReopen(id: string) {
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await updateStatus(id, 'waiting');
      await load(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reabrir.');
    } finally {
      setPending((p) => ({ ...p, [id]: false }));
    }
  }

  const columns: AdminColumn<QueueEntry>[] = [
    {
      key: 'protocol',
      header: 'Protocolo',
      sortable: true,
      render: (row) => <span className="mono">#{row.protocol}</span>,
      value: (row) => row.protocol,
    },
    {
      key: 'site_id',
      header: 'SITE ID',
      sortable: true,
      render: (row) => <span className="mono">{row.site_id}</span>,
      value: (row) => row.site_id,
    },
    { key: 'technician_name', header: 'Técnico', sortable: true },
    { key: 'request_type', header: 'Tipo', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Tag type={statusTagType[row.status]} size="sm">
          {statusLabel[row.status]}
        </Tag>
      ),
    },
    {
      key: 'sla',
      header: 'SLA total',
      render: (row) => {
        const { wait, service, total: slaTotal } = slaLabel(row);
        return <span className="muted">{slaTotal ?? `${wait} / ${service ?? '-'}`}</span>;
      },
    },
    {
      key: 'updated_at',
      header: 'Concluído em',
      sortable: true,
      sortValue: (row) => new Date(row.updated_at).getTime(),
      render: (row) => <span className="muted">{formatDate(row.updated_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <Button
          size="sm"
          kind="ghost"
          renderIcon={Restart}
          disabled={!!pending[row.id]}
          onClick={() => void handleReopen(row.id)}
        >
          Reabrir
        </Button>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-title">Arquivados</h1>
          <p className="admin-subtitle">
            Solicitações concluídas ou recusadas. Reabra para devolver à fila.
          </p>
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
        <>
          <AdminTable
            title="Solicitações arquivadas"
            description={`${total} registro(s) no histórico`}
            columns={columns}
            rows={entries}
            getRowKey={(row) => row.id}
            searchFields={(row) => [row.site_id, row.technician_name, row.protocol]}
            searchPlaceholder="Buscar por SITE ID, técnico ou protocolo"
            emptyMessage="Nenhuma solicitação arquivada."
          />
          <div style={{ marginTop: '1rem' }}>
            <Pagination
              page={page}
              pageSize={pageSize}
              pageSizes={[10, 20, 50]}
              totalItems={total}
              onChange={({ page: nextPage, pageSize: nextSize }) => {
                if (nextPage === page && nextSize === pageSize) return;
                setLoading(true);
                setPage(nextPage);
                setPageSize(nextSize);
                void load(nextPage, nextSize).finally(() => setLoading(false));
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
