import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Componente de segurança para capturar erros e evitar tela branca total
// Using direct Component import and explicit state definition to fix TypeScript property existence errors
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicit state initialization as a class property to ensure the compiler recognizes it
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f8fafc', 
          color: '#0f172a',
          fontFamily: 'system-ui, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🤕</div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Ops! Algo deu errado.</h1>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>O sistema encontrou um erro inesperado e precisou parar.</p>
            
            <div style={{ 
              backgroundColor: '#fee2e2', 
              color: '#991b1b', 
              padding: '15px', 
              borderRadius: '8px', 
              fontSize: '12px', 
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: '150px',
              marginBottom: '20px',
              border: '1px solid #fecaca'
            }}>
              {this.state.error?.toString()}
            </div>

            <button 
              onClick={() => { 
                localStorage.clear(); 
                window.location.reload(); 
              }} 
              style={{
                backgroundColor: '#0f172a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              Limpar Dados e Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children || null;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);