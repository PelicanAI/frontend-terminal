"use client"

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Warning, ArrowsClockwise } from '@phosphor-icons/react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      tags: { component: 'ChatErrorBoundary' },
      extra: { componentStack: errorInfo.componentStack }
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onReset?.()
  }

  handleReload = () => {
    window.location.reload()
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-background">
          <div className="max-w-md text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Warning size={32} weight="regular" className="text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
              <p className="text-muted-foreground">The chat encountered an error. Your data is safe.</p>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left p-4 bg-muted rounded-lg overflow-auto max-h-32">
                <code className="text-xs text-red-600">{this.state.error.message}</code>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleReset} className="gap-2">
                <ArrowsClockwise size={16} weight="regular" />
                Try Again
              </Button>
              <Button onClick={this.handleReload}>Reload Page</Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

