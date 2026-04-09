'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function SentryErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => <ErrorFallback error={error as Error} reset={resetError} />}
      showDialog={false}
      onError={() => {
        // Error already captured by Sentry.ErrorBoundary
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

function ErrorFallback({ error, reset }: { error: unknown; reset: () => void }) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary caught:', error);
    }
  }, [error]);

  const errorStack = error instanceof Error ? error.stack : String(error);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-semibold mb-4">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">
          We&apos;ve been notified and are working on a fix.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => window.location.href = '/chat'}>
            New Chat
          </Button>
        </div>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 p-4 bg-muted rounded max-w-2xl w-full">
          <summary className="cursor-pointer font-semibold mb-2">
            Error Details (Dev Only)
          </summary>
          <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
            {errorStack}
          </pre>
        </details>
      )}
    </div>
  );
}

