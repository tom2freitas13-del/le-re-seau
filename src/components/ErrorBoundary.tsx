import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Filet de sécurité : si un composant plante (erreur JS non gérée),
 * affiche un message clair au lieu d'une page blanche totale.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center text-center px-6 py-16">
          <AlertTriangle className="h-8 w-8 text-destructive mb-3" strokeWidth={1.5} />
          <h3 className="font-display text-lg font-semibold mb-1">
            {this.props.fallbackTitle || 'Un problème est survenu'}
          </h3>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
            {this.props.fallbackMessage || 'Réessayez en rechargeant la page.'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
