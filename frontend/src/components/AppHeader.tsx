import { useState } from 'react';
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
  Notification as BellIcon,
} from '@carbon/icons-react';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showDesktopNotification,
} from '../lib/notifications';

export function AppHeader({ variant = 'admin' }: { variant?: 'admin' | 'public' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const notify = useToastStore((s) => s.notify);
  const authed = !!token;
  const pathname = location.pathname;
  const isAdminArea = variant === 'admin';
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    () => getNotificationPermission(),
  );

  async function handleNotifications() {
    if (notifPermission === 'unsupported') {
      notify({ kind: 'error', title: 'Navegador sem suporte a notificações' });
      return;
    }
    if (notifPermission === 'granted') {
      showDesktopNotification('Triagem Docs', 'As notificações estão ativas.');
      return;
    }
    if (notifPermission === 'denied') {
      notify({
        kind: 'warning',
        title: 'Notificações bloqueadas',
        subtitle: 'Permita as notificações nas configurações do site no Chrome.',
      });
      return;
    }
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      showDesktopNotification('Triagem Docs', 'Você será avisado sobre novas solicitações.');
    } else if (result === 'denied') {
      notify({ kind: 'warning', title: 'Permissão de notificações negada' });
    }
  }

  return (
    <>
      <Header aria-label="AFL Engenharia">
        <HeaderName as={Link} to="/" prefix="AFL">
          Triagem Docs
        </HeaderName>
        <HeaderGlobalBar>
          {isAdminArea && authed && (
            <HeaderGlobalAction
              aria-label={
                notifPermission === 'granted'
                  ? 'Notificações ativas'
                  : 'Ativar notificações do navegador'
              }
              tooltipAlignment="start"
              onClick={handleNotifications}
            >
              <BellIcon />
            </HeaderGlobalAction>
          )}
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
      {isAdminArea && authed && (
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
