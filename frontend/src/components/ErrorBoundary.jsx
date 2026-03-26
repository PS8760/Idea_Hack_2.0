import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ background: 'var(--bg-base)' }}
        >
          <div className="max-w-md w-full">
            <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle size={24} className="text-red-500" />
                <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Something went wrong
                </h1>
              </div>
              
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                An unexpected error occurred. Try refreshing the page or contact support if the problem persists.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <summary className="cursor-pointer font-semibold mb-2">Error Details</summary>
                  <pre className="overflow-auto p-2 rounded bg-slate-900/30 max-h-40">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <button
                  onClick={this.handleReset}
                  className="flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    background: 'var(--primary)',
                    color: 'white'
                  }}
                >
                  <RefreshCw size={16} />
                  Try again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                    border: '1px solid'
                  }}
                >
                  Go home
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
