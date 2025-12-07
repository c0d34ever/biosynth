import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/20 rounded-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                <p className="text-slate-400">An unexpected error occurred</p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <h2 className="text-sm font-semibold text-red-400 mb-2">Error Details</h2>
                <p className="text-sm text-slate-300 font-mono mb-2">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-slate-500 overflow-auto max-h-48 p-3 bg-slate-900 rounded border border-slate-800">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="primary" className="flex items-center gap-2">
                <RefreshCw size={16} />
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Home size={16} />
                Go Home
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                If this problem persists, please contact support or check the browser console for more details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

