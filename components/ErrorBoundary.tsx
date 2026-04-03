'use client';

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// @ts-ignore
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    // @ts-ignore
    super(props);
    // @ts-ignore
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): any {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    // @ts-ignore
    const { hasError, error } = this.state;
    // @ts-ignore
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#0A0A0A] border border-red-500/20 p-10 rounded-3xl">
            <h1 className="text-2xl font-bold text-white mb-4">Ops! Algo deu errado.</h1>
            <p className="text-gray-400 mb-6">
              Ocorreu um erro inesperado. Por favor, tente recarregar a página.
            </p>
            <pre className="text-xs text-red-400 bg-red-500/5 p-4 rounded-xl overflow-auto text-left mb-6 max-h-40">
              {error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-bold hover:bg-[#B8962E] transition-all"
            >
              Recarregar Oráculo
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
