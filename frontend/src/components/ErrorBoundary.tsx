import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button, InlineNotification } from '@carbon/react';

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
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Algo deu errado"
          subtitle="Ocorreu um erro inesperado ao exibir esta tela. Tente recarregar a página."
        />
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <Button kind="primary" onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
          <Button kind="ghost" onClick={() => window.location.assign('/')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }
}
