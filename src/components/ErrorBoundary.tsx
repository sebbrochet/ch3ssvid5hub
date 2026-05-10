import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <svg viewBox="0 0 100 100" width="80" height="80" className="error-boundary-icon">
            <rect x="10" y="10" width="20" height="20" fill="#d4a76a" />
            <rect x="30" y="10" width="20" height="20" fill="#f0d9b5" />
            <rect x="50" y="10" width="20" height="20" fill="#d4a76a" />
            <rect x="70" y="10" width="20" height="20" fill="#f0d9b5" />
            <text x="50" y="70" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#c0392b">
              !
            </text>
          </svg>
          <h1>Something went wrong</h1>
          <p className="error-boundary-msg">{this.state.error?.message}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
