import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 flex flex-col items-center justify-center min-h-screen text-center bg-red-50">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Упс! Что-то сломалось.</h1>
          <p className="text-gray-700 mb-4">Мы уже работаем над этим.</p>
          <div className="bg-white p-4 rounded-lg shadow border border-red-200 text-left w-full max-w-md overflow-auto text-xs font-mono text-red-800">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl font-bold"
          >
            Перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;