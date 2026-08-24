import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Header, HeaderName } from '@carbon/react';
import { Login, Logout } from '@carbon/icons-react';
import { useAuthStore } from '../stores/auth';

export function PublicHeader() {
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const authed = !!token;

  return (
    <Header aria-label="AFL Engenharia" className="public-header">
      <HeaderName as={Link} to="/" prefix="AFL">
        Triagem Docs
      </HeaderName>
      <div className="public-header-actions">
        {authed ? (
          <>
            {pathname !== '/admin' && (
              <button
                type="button"
                className="public-header-link"
                onClick={() => navigate('/admin')}
              >
                Painel
              </button>
            )}
            <button
              type="button"
              className="public-header-link"
              aria-label="Sair"
              title="Sair"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              <Logout size={20} />
            </button>
          </>
        ) : (
          pathname !== '/login' && (
            <button
              type="button"
              className="public-header-link"
              aria-label="Entrar"
              title="Entrar"
              onClick={() => navigate('/login')}
            >
              <Login size={20} />
            </button>
          )
        )}
      </div>
    </Header>
  );
}
