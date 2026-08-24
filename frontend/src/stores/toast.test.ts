import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from './toast';

describe('useToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adiciona notificação com id incremental', () => {
    useToastStore.getState().notify({ kind: 'success', title: 'Olá' });
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ kind: 'success', title: 'Olá' });
  });

  it('limita o histórico visível a 5 notificações', () => {
    for (let i = 0; i < 8; i++) {
      useToastStore.getState().notify({ kind: 'info', title: `t${i}` });
    }
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(5);
    expect(toasts[0].title).toBe('t3');
    expect(toasts[4].title).toBe('t7');
  });

  it('remove por id', () => {
    useToastStore.getState().notify({ kind: 'error', title: 'a' });
    const [toast] = useToastStore.getState().toasts;
    useToastStore.getState().remove(toast.id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('remove automaticamente após o tempo limite', () => {
    useToastStore.getState().notify({ kind: 'info', title: 'temporária' });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(6000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
