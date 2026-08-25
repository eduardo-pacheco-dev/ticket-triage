import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import ArchiveIcon from '@mui/icons-material/Inventory2Outlined';
import QueueIcon from '@mui/icons-material/ListAltOutlined';
import ServiceOrderIcon from '@mui/icons-material/AssignmentOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import StationIcon from '@mui/icons-material/CellTowerOutlined';
import UsersIcon from '@mui/icons-material/ManageAccountsOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAuthStore } from '../stores/auth';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { NotificationsMenu } from './NotificationsMenu';
import { UserMenu } from './UserMenu';

const SIDENAV_PREF_KEY = 'triagem_sidenav_expanded';
const DRAWER_FULL_WIDTH = '16rem';
const DRAWER_RAIL_WIDTH = '3rem';

interface NavItem {
  label: string;
  to: string;
  active: boolean;
  icon: React.ReactNode;
}

function getNavItems(pathname: string): NavItem[] {
  return [
    {
      label: 'Dashboard',
      to: '/admin/dashboard',
      active: pathname.startsWith('/admin/dashboard'),
      icon: <DashboardIcon />,
    },
    { label: 'Fila', to: '/admin', active: pathname === '/admin', icon: <QueueIcon /> },
    {
      label: 'Arquivados',
      to: '/admin/arquivados',
      active: pathname.startsWith('/admin/arquivados'),
      icon: <ArchiveIcon />,
    },
    {
      label: 'Ordens de Serviço',
      to: '/admin/ordens-de-servico',
      active: pathname.startsWith('/admin/ordens-de-servico'),
      icon: <ServiceOrderIcon />,
    },
    {
      label: 'Estações',
      to: '/admin/estacoes',
      active: pathname.startsWith('/admin/estacoes'),
      icon: <StationIcon />,
    },
    {
      label: 'Usuários',
      to: '/admin/usuarios',
      active: pathname.startsWith('/admin/usuarios'),
      icon: <UsersIcon />,
    },
    {
      label: 'Configurações',
      to: '/admin/configuracoes',
      active: pathname.startsWith('/admin/configuracoes'),
      icon: <SettingsIcon />,
    },
  ];
}

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

  const navItems = getNavItems(pathname);

  function renderNavLinks(rail: boolean) {
    return (
      <nav aria-label="Navegação principal">
        <List disablePadding>
          {navItems.map((item) => (
            <Tooltip
              key={item.to}
              title={rail ? item.label : ''}
              placement="right"
              disableHoverListener={!rail}
            >
              <ListItemButton
                component={Link}
                to={item.to}
                selected={item.active}
                sx={{
                  minHeight: 48,
                  justifyContent: rail ? 'center' : 'initial',
                  px: rail ? 0 : 2.5,
                  '&.Mui-selected': {
                    color: 'primary.main',
                    '&:hover': { color: 'primary.main' },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: rail ? 0 : 3,
                    justifyContent: 'center',
                    color: 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!rail && <ListItemText primary={item.label} />}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </nav>
    );
  }

  const drawerSx = (width: string, transition: boolean) => ({
    width,
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
    ...(transition
      ? {
          transition: (theme: { transitions: { create: (p: string, o?: object) => string } }) =>
            theme.transitions.create('width', { easing: 'easeOut', duration: 200 }),
        }
      : {}),
    '& .MuiDrawer-paper': {
      width,
      boxSizing: 'border-box',
      overflowX: 'hidden' as const,
      marginTop: '64px',
      borderRight: '1px solid',
      borderColor: 'divider',
      pt: 1,
      ...(transition
        ? {
            transition: (theme: { transitions: { create: (p: string, o?: object) => string } }) =>
              theme.transitions.create('width', { easing: 'easeOut', duration: 200 }),
          }
        : {}),
    },
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="inherit" elevation={1} aria-label="AFL Engenharia">
        <Toolbar>
          {!isDesktop && (
            <IconButton
              edge="start"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMobileOpen((open) => !open)}
              sx={{ mr: 1.5 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            component={Link}
            to="/admin"
            variant="h6"
            noWrap
            sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}
          >
            AFL&nbsp;Triagem Docs
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <NotificationsMenu />
            <UserMenu />
          </Box>
        </Toolbar>
      </AppBar>

      {isDesktop ? (
        <>
          <Drawer
            variant="permanent"
            open
            sx={drawerSx(collapsed ? DRAWER_RAIL_WIDTH : DRAWER_FULL_WIDTH, true)}
          >
            {renderNavLinks(collapsed)}
          </Drawer>
          <button
            type="button"
            className={`sidenav-collapse-toggle${collapsed ? ' collapsed' : ''}`}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            ) : (
              <ChevronLeftIcon sx={{ fontSize: 16 }} />
            )}
          </button>
        </>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: false }}
          sx={drawerSx(DRAWER_FULL_WIDTH, false)}
        >
          {renderNavLinks(false)}
        </Drawer>
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
    </Box>
  );
}
