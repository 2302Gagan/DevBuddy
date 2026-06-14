'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

/**
 * React Error Boundary that catches rendering errors in the component tree
 * below it and displays a recovery UI instead of crashing the entire page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[DevBuddy] Unhandled render error:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset)
      }

      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 bg-[var(--bg-primary,#f8fafc)] text-center"
        >
          <div className="text-5xl" aria-hidden="true">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
            DevBuddy encountered an unexpected error. Your session data is safe in
            local storage. Try refreshing the page or clicking the button below.
          </p>
          <details className="max-w-lg text-left">
            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
              Technical details
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-xs text-red-600 dark:text-red-400">
              {error.message}
            </pre>
          </details>
          <button
            onClick={this.reset}
            className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white
                       hover:bg-teal-700 focus-visible:ring-2 focus-visible:ring-yellow-400
                       transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
