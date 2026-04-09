import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

export interface ErrorContext {
  userId?: string;
  conversationId?: string;
  action?: string;
  component?: string;
  [key: string]: unknown;
}

/**
 * Centralized error capturing with context
 * @param error - The error to capture
 * @param context - Additional context about where/why the error occurred
 * @param level - Severity level (default: 'error')
 * @returns The error message
 */
export function captureError(
  error: unknown,
  context: ErrorContext,
  level: Sentry.SeverityLevel = 'error'
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.error(`[${context.action || 'ERROR'}] ${errorMessage}`, error instanceof Error ? error : undefined, context);
  }
  
  // Send to Sentry
  Sentry.withScope((scope) => {
    // Set user context
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    
    // Set tags for filtering in Sentry
    scope.setTag('action', context.action || 'unknown');
    scope.setTag('component', context.component || 'unknown');
    if (context.conversationId) {
      scope.setTag('conversation_id', context.conversationId);
    }
    
    // Add all context as additional data
    scope.setContext('additional', context);
    scope.setLevel(level);
    
    // Capture the error
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(errorMessage, level);
    }
  });
  
  return errorMessage;
}

/**
 * Capture informational messages (not errors)
 * @param message - The message to log
 * @param context - Additional context
 * @param level - Severity level (default: 'info')
 */
export function captureMessage(
  message: string,
  context: ErrorContext,
  level: Sentry.SeverityLevel = 'info'
): void {
  Sentry.withScope((scope) => {
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    // Set tags
    if (context.action) scope.setTag('action', context.action);
    if (context.component) scope.setTag('component', context.component);
    if (context.conversationId) scope.setTag('conversation_id', context.conversationId);

    scope.setContext('additional', context);
    scope.setLevel(level);

    Sentry.captureMessage(message, level);
  });
}

/**
 * Add a breadcrumb for tracking user actions
 * @param message - Description of the action
 * @param data - Additional data
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for all future error reports
 * @param userId - The user ID
 * @param email - Optional user email
 */
export function setUserContext(userId: string | null, email?: string): void {
  if (userId) {
    Sentry.setUser({ id: userId, email });
  } else {
    Sentry.setUser(null);
  }
}

