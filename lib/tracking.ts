import { createClient } from '@/lib/supabase/client'

type EventType =
  | 'alert_dismissed' | 'alert_acted' | 'position_monitored' | 'health_score_viewed'
  | 'heatmap_ticker_clicked' | 'heatmap_sector_drilled' | 'heatmap_view_changed'
  | 'trade_graded' | 'trade_scanned' | 'daily_journal_written' | 'insight_viewed'
  | 'playbook_scanned' | 'playbook_adopted' | 'playbook_created' | 'checklist_completed'
  | 'correlation_pair_viewed' | 'correlation_ask_pelican'
  | 'earnings_event_clicked' | 'earnings_alert_set'
  | 'brief_opened' | 'brief_section_engaged'
  | 'chat_prefill_used' | 'suggested_prompt_clicked' | 'learning_term_clicked'
  | 'feature_first_use' | 'page_visited'

interface TrackEventParams {
  eventType: EventType
  ticker?: string
  feature?: string
  data?: Record<string, unknown>
}

export function trackEvent({ eventType, ticker, feature, data }: TrackEventParams): void {
  ;(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('behavioral_events').insert({
        user_id: user.id,
        event_type: eventType,
        ticker: ticker?.toUpperCase() || null,
        feature: feature || null,
        event_data: data || {},
      })
    } catch {
      // Silent fail — tracking must never break the app
    }
  })()
}

// TODO: Fire 'daily_journal_written' when daily journal feature is built
// TODO: Fire 'earnings_alert_set' when earnings alert UI is built
// TODO: Fire 'health_score_viewed' when a dedicated health score detail view is added
