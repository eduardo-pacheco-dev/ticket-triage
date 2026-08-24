import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#0f62fe' },
    secondary: { main: '#525252' },
    error: { main: '#da1e28' },
    success: { main: '#24a148' },
    warning: { main: '#f1c21b' },
    info: { main: '#0f62fe' },
    background: { default: '#f4f4f4', paper: '#ffffff' },
    text: { primary: '#161616', secondary: '#525252' },
    divider: '#e0e0e0',
  },
  typography: {
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});
