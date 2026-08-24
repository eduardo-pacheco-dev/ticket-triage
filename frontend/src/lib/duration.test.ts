import { describe, expect, it } from 'vitest';
import { formatDuration, formatEntryTime, slaLabel } from './duration';

describe('formatDuration', () => {
  it('retorna menos de um minuto para diferenças curtas', () => {
    const now = new Date();
    expect(formatDuration(now)).toBe('Menos de 1 min');
  });

  it('formata minutos e horas', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    expect(formatDuration(start, new Date(start.getTime() + 5 * 60_000))).toBe('5 min');
    expect(formatDuration(start, new Date(start.getTime() + 90 * 60_000))).toBe('1h 30min');
  });

  it('formata dias', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    expect(formatDuration(start, new Date(start.getTime() + 50 * 60 * 60_000))).toBe('2d 2h');
  });
});

describe('slaLabel', () => {
  it('aguardando mostra apenas espera', () => {
    const entry = {
      status: 'waiting',
      created_at: new Date(Date.now() - 3 * 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(slaLabel(entry)).toEqual({ wait: '3 min' });
  });

  it('em análise mostra espera e serviço em andamento', () => {
    const started = new Date(Date.now() - 30_000);
    const entry = {
      status: 'in_review',
      created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
      started_at: started.toISOString(),
      updated_at: new Date().toISOString(),
    };
    const result = slaLabel(entry);
    expect(result.wait).toBe('9 min');
    expect(result.service).toBe('Menos de 1 min');
  });

  it('finalizada mostra espera, serviço e total', () => {
    const created = new Date('2026-01-01T10:00:00Z');
    const started = new Date(created.getTime() + 20 * 60_000);
    const completed = new Date(started.getTime() + 40 * 60_000);
    const entry = {
      status: 'approved',
      created_at: created.toISOString(),
      updated_at: completed.toISOString(),
      started_at: started.toISOString(),
      completed_at: completed.toISOString(),
    };
    const result = slaLabel(entry);
    expect(result.wait).toBe('20 min');
    expect(result.service).toBe('40 min');
    expect(result.total).toBe('1h 0min');
  });
});

describe('formatEntryTime', () => {
  it('mostra apenas a hora para hoje', () => {
    const now = new Date();
    expect(formatEntryTime(now)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('prefixa ontem', () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    expect(formatEntryTime(date)).toMatch(/^ontem \d{2}:\d{2}$/);
  });

  it('inclui data para datas mais antigas', () => {
    const old = new Date('2020-03-05T14:30:00');
    expect(formatEntryTime(old)).toMatch(/^05\/03\/2020 \d{2}:\d{2}$/);
  });
});
