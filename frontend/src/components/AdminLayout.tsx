import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderMenuButton,
  HeaderGlobalBar,
  SideNav,
  SideNavItems,
  SideNavLink,
} from '@carbon/react';
import {
  Dashboard,
  Archive,
  List,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserFollow,
} from '@carbon/icons-react';
import { useAuthStore } from '../stores/auth';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { NotificationsMenu } from './NotificationsMenu';
import { UserMenu } from './UserMenu';

const SIDENAV_PREF_KEY = 'triagem_sidenav_expanded';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem(SIDENAV_PREF_KEY, String(prev));
      return !prev;
    });
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
          <NotificationsMenu />
          <UserMenu />
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
