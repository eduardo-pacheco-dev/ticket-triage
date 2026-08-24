import { Component } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Erro de render capturado pelo ErrorBoundary:', error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
        <Alert severity="error" variant="outlined">
          <strong>Algo deu errado.</strong> Ocorreu um erro inesperado ao exibir esta tela. Tente
          recarregar a página.
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
          <Button onClick={() => window.location.assign('/')}>Voltar ao início</Button>
        </Box>
      </div>
    );
  }
}
