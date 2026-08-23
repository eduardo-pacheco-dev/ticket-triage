import { create } from 'zustand';

export type ToastKind = 'error' | 'info' | 'success' | 'warning';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  subtitle?: string;
}

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 5;

interface ToastState {
  toasts: ToastItem[];
  notify: (toast: { kind: ToastKind; title: string; subtitle?: string }) => void;
  remove: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  notify({ kind, title, subtitle }) {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-(MAX_VISIBLE - 1)), { id, kind, title, subtitle }] }));
    setTimeout(() => get().remove(id), AUTO_DISMISS_MS);
  },

  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

type NotifyFn = ToastState['notify'];

export function notifyToast(toast: Parameters<NotifyFn>[0]): void {
  useToastStore.getState().notify(toast);
}
