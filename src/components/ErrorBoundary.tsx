import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component to catch and display errors gracefully.
 * Prevents the entire app from crashing when a component throws an error.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error);
            console.error('Component stack:', errorInfo.componentStack);
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        background: 'var(--bg-primary, #0f172a)',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '400px',
                            textAlign: 'center',
                            padding: '2rem',
                            borderRadius: '1rem',
                            background: 'var(--card-bg, rgba(30, 41, 59, 0.8))',
                            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.1))',
                        }}
                    >
                        <AlertTriangle
                            size={48}
                            style={{ color: '#f87171', marginBottom: '1rem' }}
                        />
                        <h2
                            style={{
                                color: 'var(--text-primary, white)',
                                fontSize: '1.5rem',
                                fontWeight: 600,
                                marginBottom: '0.5rem',
                            }}
                        >
                            Something went wrong
                        </h2>
                        <p
                            style={{
                                color: 'var(--text-secondary, #94a3b8)',
                                fontSize: '0.875rem',
                                marginBottom: '1.5rem',
                            }}
                        >
                            The application encountered an unexpected error.
                            Please try reloading the page.
                        </p>

                        {import.meta.env.DEV && this.state.error && (
                            <pre
                                style={{
                                    textAlign: 'left',
                                    padding: '1rem',
                                    marginBottom: '1.5rem',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    color: '#f87171',
                                    fontSize: '0.75rem',
                                    overflow: 'auto',
                                    maxHeight: '150px',
                                }}
                            >
                                {this.state.error.message}
                            </pre>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--btn-border, rgba(255, 255, 255, 0.1))',
                                    background: 'var(--btn-bg, rgba(255, 255, 255, 0.05))',
                                    color: 'var(--text-primary, white)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    background: '#3b82f6',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                }}
                            >
                                <RefreshCw size={16} />
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
