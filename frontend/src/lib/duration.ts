type DateLike = Date | string;

function toMs(value: DateLike): number {
  return new Date(value).getTime();
}

export function formatDuration(start: DateLike, end?: DateLike): string {
  const diffMs = Math.max(0, (end ? toMs(end) : Date.now()) - toMs(start));
  const totalMinutes = Math.floor(diffMs / 60_000);

  if (totalMinutes < 1) return 'Menos de 1 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) return `${hours}h ${mins}min`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h`;
}

export function slaLabel(entry: {
  status: string;
  created_at: DateLike;
  updated_at: DateLike;
  started_at?: DateLike;
  completed_at?: DateLike;
}): { wait: string; service?: string; total?: string } {
  if (entry.status === 'waiting') {
    return { wait: formatDuration(entry.created_at) };
  }

  const wait = formatDuration(entry.created_at, entry.started_at ?? entry.updated_at);

  if (entry.status === 'in_review') {
    const start = entry.started_at ?? entry.created_at;
    return { wait, service: formatDuration(start) };
  }

  if (entry.status === 'approved' || entry.status === 'rejected') {
    const start = entry.started_at ?? entry.created_at;
    const service = formatDuration(start, entry.completed_at ?? entry.updated_at);
    const total = formatDuration(entry.created_at, entry.completed_at ?? entry.updated_at);
    return { wait, service, total };
  }

  return { wait };
}
