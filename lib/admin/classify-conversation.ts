// Conversation classification utility for admin dashboard.
// Classifies conversations by owner (user vs team) and type (organic vs action vs brief).

export type ConvoClassification = 'organic' | 'action' | 'brief'
export type ConvoOwner = 'user' | 'team'

export interface ConvoTag {
  owner: ConvoOwner
  classification: ConvoClassification
  source?: string
}

export function classifyConversation(
  conversation: {
    user_id: string
    title: string | null
    metadata: Record<string, unknown> | null
  },
  teamUserIds: Set<string>
): ConvoTag {
  const owner: ConvoOwner = teamUserIds.has(conversation.user_id) ? 'team' : 'user'

  // Check source_tracking first (most reliable, newer conversations)
  const sourceTracking = conversation.metadata?.source_tracking as
    | { classification?: string; initiated_by?: string }
    | undefined
  if (sourceTracking) {
    const classification: ConvoClassification =
      sourceTracking.classification === 'organic' ? 'organic' : 'action'
    return { owner, classification, source: sourceTracking.initiated_by }
  }

  // Check panel source (older pattern)
  if (conversation.metadata?.source === 'pelican_panel') {
    const context = conversation.metadata.context as string | undefined
    return { owner, classification: 'action', source: context ?? 'panel' }
  }

  // Check for brief system prompt leaks in title
  if (conversation.title?.startsWith('You are Pelican')) {
    return { owner, classification: 'brief' }
  }

  // Default: organic (typed conversation)
  return { owner, classification: 'organic' }
}
