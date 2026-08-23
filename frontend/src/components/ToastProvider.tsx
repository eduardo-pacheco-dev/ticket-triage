import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastNotification } from '@carbon/react';

export type ToastKind = 'error' | 'info' | 'success' | 'warning';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  subtitle?: string;
}

type NotifyFn = (toast: { kind: ToastKind; title: string; subtitle?: string }) => void;

const ToastContext = createContext<NotifyFn>(() => {});

const AUTO_DISMISS_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback<NotifyFn>(
    (toast) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
      setTimeout(() => remove(id), AUTO_DISMISS_MS);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <ToastNotification
            key={t.id}
            kind={t.kind}
            lowContrast
            title={t.title}
            subtitle={t.subtitle}
            onCloseButtonClick={() => remove(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): NotifyFn {
  return useContext(ToastContext);
}
