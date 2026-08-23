import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
} from '@carbon/react';
import {
  Logout,
  Login,
  Dashboard,
  Document,
  List,
  Settings,
} from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext';

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const authed = !!token;
  const pathname = location.pathname;

  return (
    <>
      <Header aria-label="AFL Engenharia">
        <HeaderName as={Link} to="/" prefix="AFL">
          Triagem Docs
        </HeaderName>
        <HeaderGlobalBar>
          {authed ? (
            <HeaderGlobalAction
              aria-label="Sair"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              tooltipAlignment="end"
            >
              <Logout />
            </HeaderGlobalAction>
          ) : (
            pathname !== '/login' && (
              <HeaderGlobalAction
                aria-label="Entrar"
                tooltipAlignment="end"
                onClick={() => navigate('/login')}
              >
                <Login />
              </HeaderGlobalAction>
            )
          )}
        </HeaderGlobalBar>
      </Header>
      {authed && (
        <SideNav isFixedNav aria-label="Navegação principal" expanded>
          <SideNavItems>
            <SideNavLink
              as={Link}
              to="/admin/dashboard"
              renderIcon={Dashboard}
              isActive={pathname.startsWith('/admin/dashboard')}
            >
              Dashboard
            </SideNavLink>
            <SideNavLink
              as={Link}
              to="/"
              renderIcon={Document}
              isActive={pathname === '/'}
            >
              Check-in
            </SideNavLink>
            <SideNavLink
              as={Link}
              to="/admin"
              renderIcon={List}
              isActive={pathname === '/admin'}
            >
              Fila
            </SideNavLink>
            <SideNavLink
              as={Link}
              to="/admin/arquivados"
              renderIcon={Document}
              isActive={pathname.startsWith('/admin/arquivados')}
            >
              Arquivados
            </SideNavLink>
            <SideNavLink
              as={Link}
              to="/admin/configuracoes"
              renderIcon={Settings}
              isActive={pathname.startsWith('/admin/configuracoes')}
            >
              Configurações
            </SideNavLink>
          </SideNavItems>
        </SideNav>
      )}
    </>
  );
}
