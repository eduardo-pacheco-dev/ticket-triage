import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Stack, TextInput, Button, InlineNotification, Tile } from '@carbon/react';
import { Login as LoginIcon } from '@carbon/icons-react';
import { AppHeader } from '../components/AppHeader';
import { useAuthStore } from '../stores/auth';
import { ApiError } from '../lib/api';
import { loginSchema } from '@ticket-triage/shared';
import { zodFieldErrors } from '../lib/schemas';

export default function LoginPage() {
  const navigate = useNavigate();
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
      navigate(mustChange ? '/admin/configuracoes' : '/admin', { replace: true });
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
      <AppHeader variant="public" />
      <main className="login-main">
        <div className="login-container">
          <Tile className="login-card">
            <h1 className="login-title">Acessar Painel</h1>
            <p className="login-subtitle">
              Área restrita. Utilize suas credenciais para continuar.
            </p>
            <Form onSubmit={handleSubmit}>
              <Stack gap={6}>
                {error && (
                  <InlineNotification
                    kind="error"
                    lowContrast
                    title="Falha no login"
                    subtitle={error}
                    hideCloseButton
                  />
                )}
                <TextInput
                  id="username"
                  labelText="Usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  invalid={!!fieldErrors.username}
                  invalidText={fieldErrors.username}
                  required
                  autoComplete="username"
                />
                <TextInput
                  id="password"
                  labelText="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  invalid={!!fieldErrors.password}
                  invalidText={fieldErrors.password}
                  required
                  autoComplete="current-password"
                />
                <Button type="submit" renderIcon={LoginIcon} size="lg" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </Stack>
            </Form>
          </Tile>
        </div>
      </main>
    </div>
  );
}
