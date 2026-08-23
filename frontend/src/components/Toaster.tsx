import { ToastNotification } from '@carbon/react';
import { useToastStore } from '../stores/toast';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
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
  );
}
