import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '../stores/auth';

export function PublicHeader() {
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const authed = !!token;

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      className="public-header"
      aria-label="AFL Engenharia"
    >
      <Toolbar>
        <Typography
          component={Link}
          to="/"
          variant="h6"
          noWrap
          sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}
        >
          AFL&nbsp;
          <Box component="span" sx={{ fontWeight: 400 }}>
            Triagem Docs
          </Box>
        </Typography>
        <Box className="public-header-actions">
          {authed ? (
            <>
              {pathname !== '/admin' && (
                <IconButton
                  className="public-header-link"
                  aria-label="Painel"
                  title="Painel"
                  onClick={() => navigate('/admin')}
                >
                  <DashboardIcon />
                </IconButton>
              )}
              <IconButton
                className="public-header-link"
                aria-label="Sair"
                title="Sair"
                onClick={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
              >
                <LogoutIcon />
              </IconButton>
            </>
          ) : (
            pathname !== '/login' && (
              <IconButton
                className="public-header-link"
                aria-label="Entrar"
                title="Entrar"
                onClick={() => navigate('/login')}
              >
                <LoginIcon />
              </IconButton>
            )
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
