import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useToastStore } from '../stores/toast';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <Alert
          key={t.id}
          severity={t.kind}
          variant="standard"
          onClose={() => remove(t.id)}
          sx={{ boxShadow: 3, bgcolor: 'background.paper' }}
        >
          <strong>{t.title}</strong>
          {t.subtitle ? (
            <Box component="span" sx={{ display: 'block', fontSize: '0.8125rem' }}>
              {t.subtitle}
            </Box>
          ) : null}
        </Alert>
      ))}
    </div>
  );
}
