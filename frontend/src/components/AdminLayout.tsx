import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderMenuButton,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
} from '@carbon/react';
import {
  Dashboard,
  Archive,
  List,
  Settings,
  Logout,
  ChevronLeft,
  ChevronRight,
  Notification as BellIcon,
  UserFollow,
} from '@carbon/icons-react';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { useIsDesktop } from '../hooks/useIsDesktop';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showDesktopNotification,
} from '../lib/notifications';

const SIDENAV_PREF_KEY = 'triagem_sidenav_expanded';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const notify = useToastStore((s) => s.notify);
  const pathname = location.pathname;

  useEffect(() => {
    if (mustChangePassword && pathname !== '/admin/configuracoes') {
      navigate('/admin/configuracoes', { replace: true });
    }
  }, [mustChangePassword, pathname, navigate]);

  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(SIDENAV_PREF_KEY) === 'false',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    () => getNotificationPermission(),
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem(SIDENAV_PREF_KEY, String(prev));
      return !prev;
    });
  }

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
        subtitle: 'Permita as notificações nas configurações do site no navegador.',
      });
      return;
    }
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      showDesktopNotification('Triagem Docs', 'Você será avisado sobre novas solicitações.');
    }
  }

  const navLinks = (
    <SideNavItems>
      <SideNavLink
        as={Link}
        to="/admin/dashboard"
        renderIcon={Dashboard}
        isActive={pathname.startsWith('/admin/dashboard')}
      >
        Dashboard
      </SideNavLink>
      <SideNavLink as={Link} to="/admin" renderIcon={List} isActive={pathname === '/admin'}>
        Fila
      </SideNavLink>
      <SideNavLink
        as={Link}
        to="/admin/arquivados"
        renderIcon={Archive}
        isActive={pathname.startsWith('/admin/arquivados')}
      >
        Arquivados
      </SideNavLink>
      <SideNavLink
        as={Link}
        to="/admin/usuarios"
        renderIcon={UserFollow}
        isActive={pathname.startsWith('/admin/usuarios')}
      >
        Usuários
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
  );

  return (
    <>
      <Header aria-label="AFL Engenharia">
        {!isDesktop && (
          <HeaderMenuButton
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
            isActive={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          />
        )}
        <HeaderName as={Link} to="/admin" prefix="AFL">
          Triagem Docs
        </HeaderName>
        <HeaderGlobalBar>
          <span className="topbar-user">{username}</span>
          <HeaderGlobalAction
            aria-label={
              notifPermission === 'granted' ? 'Notificações ativas' : 'Ativar notificações'
            }
            tooltipAlignment="start"
            onClick={() => void handleNotifications()}
          >
            <BellIcon size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label="Sair"
            tooltipAlignment="end"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
          >
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      {isDesktop ? (
        <>
          <SideNav
            aria-label="Navegação principal"
            isRail={collapsed}
            expanded={collapsed ? undefined : true}
            addMouseListeners={!collapsed}
            addFocusListeners={!collapsed}
          >
            {navLinks}
          </SideNav>
          <button
            type="button"
            className={`sidenav-collapse-toggle${collapsed ? ' collapsed' : ''}`}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            onClick={toggleCollapsed}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </>
      ) : (
        <SideNav
          aria-label="Navegação principal"
          expanded={mobileOpen}
          isPersistent={false}
          addFocusListeners={false}
          onOverlayClick={() => setMobileOpen(false)}
        >
          {navLinks}
        </SideNav>
      )}

      <main
        className={`admin-content${
          !isDesktop ? '' : collapsed ? ' admin-content-rail' : ' admin-content-full'
        }`}
      >
        <div className="admin-page">
          <Outlet />
        </div>
      </main>
    </>
  );
}
