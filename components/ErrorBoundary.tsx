"use client"
import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || 'An unexpected error occurred.'
      return (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 18 }}>Something went wrong.</h2>
          <p style={{ color: '#334155' }}>{message}</p>
          <p style={{ color: '#64748b', fontSize: 14 }}>Check console for details.</p>
        </div>
      )
    }
    return this.props.children
  }
}
