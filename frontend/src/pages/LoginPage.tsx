import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import LoginIcon from '@mui/icons-material/Login';
import { PublicHeader } from '../components/PublicHeader';
import { useAuthStore } from '../stores/auth';
import { ApiError } from '../lib/api';
import { loginSchema } from '@ticket-triage/shared';
import { zodFieldErrors } from '../lib/schemas';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setLoading(true);

    try {
      await login(parsed.data.username, parsed.data.password);
      const mustChange = useAuthStore.getState().mustChangePassword;
      navigate(mustChange ? '/admin/configuracoes' : (from ?? '/admin'), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Usuário ou senha inválidos.');
      } else {
        setError(err instanceof Error ? err.message : 'Falha no login.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <PublicHeader />
      <main className="login-main">
        <div className="login-container">
          <Paper className="checkin-card login-card">
            <h1 className="login-title">Acessar Painel</h1>
            <p className="login-subtitle">
              Área restrita. Utilize suas credenciais para continuar.
            </p>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={3}>
                {error && (
                  <Alert severity="error" variant="outlined">
                    <strong>Falha no login.</strong> {error}
                  </Alert>
                )}
                <TextField
                  id="username"
                  label="Usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  error={!!fieldErrors.username}
                  helperText={fieldErrors.username}
                  required
                  autoComplete="username"
                  fullWidth
                />
                <TextField
                  id="password"
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password}
                  required
                  autoComplete="current-password"
                  fullWidth
                />
                <Button type="submit" size="large" endIcon={<LoginIcon />} disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </div>
      </main>
    </div>
  );
}
