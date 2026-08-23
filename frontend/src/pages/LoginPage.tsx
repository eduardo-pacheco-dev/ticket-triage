import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Stack,
  TextInput,
  Button,
  InlineNotification,
  Tile,
} from '@carbon/react';
import { Login as LoginIcon } from '@carbon/icons-react';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/admin', { replace: true });
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
      <AppHeader />
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
                  required
                  autoComplete="username"
                />
                <TextInput
                  id="password"
                  labelText="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
