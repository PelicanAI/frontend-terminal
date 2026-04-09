/**
 * Supabase RLS-Safe Helper Functions
 * 
 * These helpers ensure UPDATE, DELETE, and UPSERT operations
 * properly detect RLS rejections by chaining .select() and
 * checking for empty data responses.
 * 
 * CRITICAL: Without .select(), Supabase returns success even
 * when RLS blocks the operation. These helpers fix that.
 * 
 * @version 1.0.0 - UUID Migration Compatible
 */

import { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

// ============================================================================
// Types
// ============================================================================

export interface RLSResult<T> {
  data: T | null
  error: PostgrestError | Error | null
  success: boolean
}

export interface RLSDeleteResult {
  deleted: boolean
  count: number
  error: PostgrestError | Error | null
}

export interface RLSBulkResult<T> {
  data: T[] | null
  error: PostgrestError | Error | null
  success: boolean
  count: number
}

// ============================================================================
// UUID Validation
// ============================================================================

/**
 * Validate UUID format (v4 compatible).
 * Use this before any database operation that requires user_id.
 * 
 * @example
 * if (!isValidUUID(userId)) {
 *   throw new Error('Invalid user ID')
 * }
 */
export function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Ensure a value is a valid UUID or return null.
 * Safe for database operations - will not pass invalid IDs.
 */
export function ensureUUID(str: string | null | undefined): string | null {
  return isValidUUID(str) ? str! : null
}

// ============================================================================
// UPDATE Operations
// ============================================================================

/**
 * Perform an UPDATE with RLS rejection detection.
 * Returns the updated row or null if RLS blocked the operation.
 * 
 * @example
 * const { data, error, success } = await updateWithRLSCheck(
 *   supabase,
 *   'conversations',
 *   { title: 'New Title' },
 *   { id: conversationId, user_id: userId }
 * )
 */
export async function updateWithRLSCheck<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  updates: Partial<T>,
  filters: Record<string, unknown>,
  options?: {
    isFilters?: Record<string, null>  // For .is() filters like .is('deleted_at', null)
  }
): Promise<RLSResult<T>> {
  try {
    let query = supabase.from(table).update(updates)
    
    // Apply .eq() filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    // Apply .is() filters (for null checks)
    if (options?.isFilters) {
      Object.entries(options.isFilters).forEach(([key, value]) => {
        query = query.is(key, value)
      })
    }
    
    const { data, error } = await query.select().single()
    
    if (error) {
      return { data: null, error, success: false }
    }
    
    if (!data) {
      return { 
        data: null, 
        error: new Error('RLS rejection: Operation succeeded but no data returned. User may not have permission.'),
        success: false 
      }
    }
    
    return { data: data as T, error: null, success: true }
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(String(err)),
      success: false 
    }
  }
}

// ============================================================================
// DELETE Operations
// ============================================================================

/**
 * Perform a DELETE with RLS rejection detection.
 * Returns deleted count or 0 if RLS blocked the operation.
 * 
 * @example
 * const { deleted, count, error } = await deleteWithRLSCheck(
 *   supabase,
 *   'conversations',
 *   { id: conversationId, user_id: userId }
 * )
 */
export async function deleteWithRLSCheck(
  supabase: SupabaseClient,
  table: string,
  filters: Record<string, unknown>
): Promise<RLSDeleteResult> {
  try {
    let query = supabase.from(table).delete()
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    const { data, error } = await query.select()
    
    if (error) {
      return { deleted: false, count: 0, error }
    }
    
    if (!data || data.length === 0) {
      return { 
        deleted: false, 
        count: 0,
        error: new Error('RLS rejection: No rows deleted. Row may not exist or user may not have permission.')
      }
    }
    
    return { deleted: true, count: data.length, error: null }
  } catch (err) {
    return { 
      deleted: false, 
      count: 0,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

/**
 * Perform a bulk DELETE with RLS rejection detection.
 * Useful for clearing user data (conversations, messages, etc.)
 * 
 * Note: This does NOT fail if no rows match - it's expected for "clear all" operations.
 * Check the count to see how many rows were deleted.
 */
export async function bulkDeleteWithRLSCheck(
  supabase: SupabaseClient,
  table: string,
  filters: Record<string, unknown>
): Promise<RLSDeleteResult> {
  try {
    let query = supabase.from(table).delete()
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    const { data, error } = await query.select()
    
    if (error) {
      return { deleted: false, count: 0, error }
    }
    
    // For bulk delete, empty result is OK (no rows matched)
    const count = data?.length || 0
    return { deleted: true, count, error: null }
  } catch (err) {
    return { 
      deleted: false, 
      count: 0,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

// ============================================================================
// UPSERT Operations
// ============================================================================

/**
 * Perform an UPSERT with RLS rejection detection.
 * 
 * @example
 * const { data, error, success } = await upsertWithRLSCheck(
 *   supabase,
 *   'user_settings',
 *   { user_id: userId, theme: 'dark' }
 * )
 */
export async function upsertWithRLSCheck<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  values: Partial<T>,
  options?: {
    onConflict?: string  // Column(s) for conflict resolution
  }
): Promise<RLSResult<T>> {
  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(values, options?.onConflict ? { onConflict: options.onConflict } : undefined)
      .select()
      .single()
    
    if (error) {
      return { data: null, error, success: false }
    }
    
    if (!data) {
      return { 
        data: null, 
        error: new Error('RLS rejection: Upsert succeeded but no data returned. User may not have permission.'),
        success: false 
      }
    }
    
    return { data: data as T, error: null, success: true }
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(String(err)),
      success: false 
    }
  }
}

// ============================================================================
// INSERT Operations
// ============================================================================

/**
 * Perform a bulk INSERT with RLS rejection detection.
 * 
 * @example
 * const { data, error, success, count } = await bulkInsertWithRLSCheck(
 *   supabase,
 *   'messages',
 *   [{ content: 'Hello' }, { content: 'World' }]
 * )
 */
export async function bulkInsertWithRLSCheck<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  rows: Partial<T>[]
): Promise<RLSBulkResult<T>> {
  try {
    if (!rows || rows.length === 0) {
      return { data: [], error: null, success: true, count: 0 }
    }
    
    const { data, error } = await supabase
      .from(table)
      .insert(rows)
      .select()
    
    if (error) {
      return { data: null, error, success: false, count: 0 }
    }
    
    if (!data || data.length === 0) {
      return { 
        data: null, 
        error: new Error('RLS rejection: Insert succeeded but no data returned. User may not have permission.'),
        success: false,
        count: 0
      }
    }
    
    // Check if all rows were inserted
    if (data.length < rows.length) {
      // Partial insert detected: some rows may have been rejected by RLS
    }
    
    return { data: data as T[], error: null, success: true, count: data.length }
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(String(err)),
      success: false,
      count: 0
    }
  }
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Log RLS errors with context for debugging.
 * Integrates with Sentry if available.
 */
export function logRLSError(
  operation: 'update' | 'delete' | 'upsert' | 'insert',
  table: string,
  error: Error | PostgrestError | null,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const isRLSRejection = errorMessage.includes('RLS rejection')
  
  logger.error(`Supabase ${operation.toUpperCase()} ${table}`, error instanceof Error ? error : undefined, {
    isRLSRejection,
    ...context
  })
  
  // Server-side Sentry (Next.js API routes)
  if (typeof window === 'undefined') {
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          tags: { operation, table, isRLSRejection },
          extra: context
        }
      )
    }).catch(() => {
      // Sentry not available, skip
    })
  }
  
  // Client-side Sentry
  if (typeof window !== 'undefined') {
    const win = window as unknown as { Sentry?: { captureException: (err: Error, ctx?: unknown) => void } }
    if (win.Sentry) {
      win.Sentry.captureException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          tags: { operation, table, isRLSRejection },
          extra: context
        }
      )
    }
  }
}

// ============================================================================
// Convenience Wrappers for Common Tables
// ============================================================================

/**
 * Update a conversation with RLS check.
 * Handles the deleted_at null check automatically.
 */
export async function updateConversation(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  updates: Record<string, unknown>
): Promise<RLSResult<Record<string, unknown>>> {
  if (!isValidUUID(userId)) {
    return {
      data: null,
      error: new Error('Invalid user_id: must be a valid UUID'),
      success: false
    }
  }
  
  return updateWithRLSCheck(
    supabase,
    'conversations',
    updates,
    { id: conversationId, user_id: userId },
    { isFilters: { deleted_at: null } }
  )
}

/**
 * Soft-delete a conversation (set deleted_at).
 */
export async function softDeleteConversation(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<RLSResult<Record<string, unknown>>> {
  if (!isValidUUID(userId)) {
    return {
      data: null,
      error: new Error('Invalid user_id: must be a valid UUID'),
      success: false
    }
  }
  
  return updateWithRLSCheck(
    supabase,
    'conversations',
    { 
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { id: conversationId, user_id: userId },
    { isFilters: { deleted_at: null } }
  )
}

/**
 * Hard-delete a conversation.
 */
export async function hardDeleteConversation(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<RLSDeleteResult> {
  if (!isValidUUID(userId)) {
    return {
      deleted: false,
      count: 0,
      error: new Error('Invalid user_id: must be a valid UUID')
    }
  }
  
  return deleteWithRLSCheck(
    supabase,
    'conversations',
    { id: conversationId, user_id: userId }
  )
}

/**
 * Update a message with RLS check.
 */
export async function updateMessage(
  supabase: SupabaseClient,
  messageId: string,
  updates: Record<string, unknown>
): Promise<RLSResult<Record<string, unknown>>> {
  return updateWithRLSCheck(
    supabase,
    'messages',
    { ...updates, updated_at: new Date().toISOString() },
    { id: messageId }
  )
}

/**
 * Update a file with RLS check.
 */
export async function updateFile(
  supabase: SupabaseClient,
  fileId: string,
  updates: Record<string, unknown>
): Promise<RLSResult<Record<string, unknown>>> {
  return updateWithRLSCheck(
    supabase,
    'files',
    updates,
    { id: fileId }
  )
}

/**
 * Upsert user settings with RLS check.
 */
export async function upsertUserSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: Record<string, unknown>
): Promise<RLSResult<Record<string, unknown>>> {
  if (!isValidUUID(userId)) {
    return {
      data: null,
      error: new Error('Invalid user_id: must be a valid UUID'),
      success: false
    }
  }
  
  return upsertWithRLSCheck(
    supabase,
    'user_settings',
    {
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  )
}

/**
 * Clear all user data (for account deletion or history clear).
 * Returns results for each table.
 */
export async function clearUserData(
  supabase: SupabaseClient,
  userId: string,
  tables: string[] = ['conversations', 'messages']
): Promise<{ results: Record<string, RLSDeleteResult>, allSuccess: boolean }> {
  if (!isValidUUID(userId)) {
    const errorResult: RLSDeleteResult = {
      deleted: false,
      count: 0,
      error: new Error('Invalid user_id: must be a valid UUID')
    }
    return {
      results: Object.fromEntries(tables.map(t => [t, errorResult])),
      allSuccess: false
    }
  }
  
  const results: Record<string, RLSDeleteResult> = {}
  
  for (const table of tables) {
    results[table] = await bulkDeleteWithRLSCheck(supabase, table, { user_id: userId })
  }
  
  const allSuccess = Object.values(results).every(r => r.error === null)
  
  return { results, allSuccess }
}

