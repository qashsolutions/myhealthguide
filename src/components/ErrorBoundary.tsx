'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

/**
 * Global error boundary component
 * Catches JavaScript errors and displays user-friendly message
 */

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // In production, send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry or similar service
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // Placeholder for error logging service
    // Example: Sentry.captureException(error, { extra: errorInfo });
    
    // For now, just log to console
    console.error('Production error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-elder-background px-4">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-elder-lg shadow-elder p-8 text-center">
              {/* Error icon */}
              <div className="mx-auto w-20 h-20 bg-health-danger-bg rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="h-10 w-10 text-health-danger" />
              </div>

              {/* Error message */}
              <h1 className="text-elder-2xl font-bold text-elder-text mb-3">
                Oops! Something went wrong
              </h1>
              
              <p className="text-elder-base text-elder-text-secondary mb-6">
                We're sorry for the inconvenience. The application encountered an unexpected error.
              </p>

              {/* Error details (development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-elder-sm text-elder-text-secondary hover:text-elder-text">
                    View error details
                  </summary>
                  <div className="mt-3 p-4 bg-elder-background rounded-elder text-elder-sm">
                    <p className="font-semibold text-health-danger mb-2">
                      {this.state.error.message}
                    </p>
                    <pre className="overflow-auto text-xs text-elder-text-secondary">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={this.handleReset}
                  icon={<RefreshCw className="h-5 w-5" />}
                >
                  Try Again
                </Button>
                
                <Button
                  variant="secondary"
                  size="large"
                  fullWidth
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
                
                <Button
                  variant="secondary"
                  size="large"
                  fullWidth
                  onClick={this.handleGoHome}
                  icon={<Home className="h-5 w-5" />}
                >
                  Go to Home
                </Button>
              </div>

              {/* Support message */}
              <p className="mt-6 text-elder-sm text-elder-text-secondary">
                If this problem persists, please contact support at{' '}
                <a 
                  href="mailto:support@myhealthguide.com" 
                  className="text-primary-600 hover:underline"
                >
                  support@myhealthguide.com
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}