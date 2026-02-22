/**
 * Message Source Tagging + Conversation Classification
 * =====================================================
 *
 * Every message gets a `source` tag in its metadata. Every conversation gets
 * classification metadata derived from its messages. The sidebar groups by
 * classification. The admin dashboard filters by source.
 *
 * Source is stored in messages.metadata.source (JSONB) and conversation
 * classification in conversations.metadata.source_tracking (JSONB).
 * No schema changes needed — both columns are already JSONB.
 */

import type { PelicanPanelContext } from '@/hooks/use-pelican-panel'

// =============================================================================
// TYPES
// =============================================================================

export type MessageSource =
  | 'typed'

  // Position page actions
  | 'position_scan'
  | 'position_fix'
  | 'position_health'
  | 'position_intel'
  | 'position_action'

  // Journal actions
  | 'journal_review'
  | 'journal_compliance'
  | 'journal_grade'
  | 'journal_scan'
  | 'journal_replay'

  // Feature page actions
  | 'heatmap_click'
  | 'earnings_click'
  | 'economic_calendar_click'
  | 'brief_action'
  | 'correlation_ask'

  // Chat UI elements
  | 'welcome_chip'
  | 'action_bar'
  | 'learn_mode'
  | 'search_ticker'

  // Future
  | 'whisper'
  | 'deja_vu'
  | 'journal_save'

export type ConversationClass = 'organic' | 'action' | 'promoted'

export interface ConversationSourceMetadata {
  initiated_by: MessageSource
  is_promoted: boolean
  classification: ConversationClass
  action_message_count: number
  typed_message_count: number
  source_breakdown: Partial<Record<MessageSource, number>>
}

// =============================================================================
// CONSTANTS
// =============================================================================

// =============================================================================
// CONTEXT → SOURCE MAPPING
// =============================================================================

/**
 * Maps PelicanPanelContext to a default MessageSource.
 * Used as fallback when a specific source isn't provided by the call site.
 */
export function contextToSource(context: PelicanPanelContext): MessageSource {
  switch (context) {
    case 'heatmap': return 'heatmap_click'
    case 'earnings': return 'earnings_click'
    case 'calendar': return 'economic_calendar_click'
    case 'journal': return 'journal_scan'
    case 'morning': return 'brief_action'
    case 'brief': return 'brief_action'
    case 'correlations': return 'correlation_ask'
    case 'search': return 'search_ticker'
    default: return 'typed'
  }
}

// =============================================================================
// CONVERSATION METADATA UTILITIES
// =============================================================================

/**
 * Create initial conversation source metadata when a conversation is created.
 */
export function createConversationSourceMetadata(
  initiatedBy: MessageSource
): ConversationSourceMetadata {
  return {
    initiated_by: initiatedBy,
    is_promoted: initiatedBy === 'typed',
    classification: initiatedBy === 'typed' ? 'organic' : 'action',
    action_message_count: initiatedBy === 'typed' ? 0 : 1,
    typed_message_count: initiatedBy === 'typed' ? 1 : 0,
    source_breakdown: { [initiatedBy]: 1 },
  }
}

/**
 * Update conversation metadata when a new message is sent.
 * Returns the updated metadata to write back to the conversation.
 */
export function updateConversationSourceMetadata(
  existing: ConversationSourceMetadata | null | undefined,
  newMessageSource: MessageSource
): ConversationSourceMetadata {
  if (!existing) {
    return createConversationSourceMetadata(newMessageSource)
  }

  const updated = { ...existing }

  if (newMessageSource === 'typed') {
    updated.typed_message_count = (updated.typed_message_count || 0) + 1
  } else {
    updated.action_message_count = (updated.action_message_count || 0) + 1
  }

  updated.source_breakdown = { ...updated.source_breakdown }
  updated.source_breakdown[newMessageSource] =
    (updated.source_breakdown[newMessageSource] || 0) + 1

  // Promote if a typed message arrives in an action-initiated conversation
  if (
    newMessageSource === 'typed' &&
    updated.initiated_by !== 'typed' &&
    !updated.is_promoted
  ) {
    updated.is_promoted = true
    updated.classification = 'promoted'
  }

  return updated
}

// =============================================================================
// DISPLAY UTILITIES
// =============================================================================

const SOURCE_LABELS: Record<MessageSource, string> = {
  typed: 'Chat',
  position_scan: 'Position Scan',
  position_fix: 'Fix Risk',
  position_health: 'Health Score',
  position_intel: 'Portfolio Intel',
  position_action: "Today's Action",
  journal_review: 'Plan Review',
  journal_compliance: 'Compliance',
  journal_grade: 'Trade Grade',
  journal_scan: 'Trade Scan',
  journal_replay: 'Trade Replay',
  heatmap_click: 'Heatmap',
  earnings_click: 'Earnings',
  economic_calendar_click: 'Economic Calendar',
  brief_action: 'Morning Brief',
  correlation_ask: 'Correlation',
  welcome_chip: 'Quick Start',
  action_bar: 'Action Bar',
  learn_mode: 'Learn Mode',
  search_ticker: 'Ticker Search',
  whisper: 'Whisper',
  deja_vu: 'Deja Vu',
  journal_save: 'Journal Save',
}

/**
 * Human-readable label for a message source.
 */
export function getSourceLabel(source: MessageSource): string {
  return SOURCE_LABELS[source] || source
}

/**
 * Check if a source is an "action" (non-typed) source.
 */
export function isActionSource(source: MessageSource): boolean {
  return source !== 'typed'
}

/**
 * Get the conversation classification from conversation metadata.
 * Handles legacy conversations that have no source_tracking.
 */
export function getConversationClass(
  metadata: Record<string, unknown> | null | undefined
): ConversationClass {
  const sourceTracking = metadata?.source_tracking as ConversationSourceMetadata | undefined
  if (!sourceTracking) return 'organic'
  return sourceTracking.classification || 'organic'
}
