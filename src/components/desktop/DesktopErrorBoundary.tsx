'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/desktop/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DesktopErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DesktopErrorBoundary caught error:', error, errorInfo);
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 text-center rounded-[24px] frost">
          <div className="h-12 w-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-[18px] font-semibold text-ink mb-1">
            Something went wrong on this page.
          </h2>
          <p className="text-[14px] text-ink-3 max-w-md mb-6">
            An unexpected error occurred while loading this view. You can reload to try again.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={this.handleReload}
            className="gap-2"
          >
            <RotateCcw size={16} />
            <span>Reload</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
