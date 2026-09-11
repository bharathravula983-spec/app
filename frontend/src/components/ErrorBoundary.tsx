import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#ff5c8a', fontFamily: 'monospace', background: '#06080d', minHeight: '100vh' }}>
          <h2 style={{ marginBottom: 16 }}>⚠ App crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#e7edf3' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
