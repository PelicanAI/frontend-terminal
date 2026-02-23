// ── Trader Survey (matches DB: trader_survey) ──

export interface TraderSurvey {
  id: string
  user_id: string
  experience_level: string
  primary_style: string
  markets_traded: string[]
  account_size_range: string | null
  risk_tolerance: string | null
  primary_goal: string | null
  technical_analysis_level: string | null
  fundamental_analysis_level: string | null
  options_knowledge: string | null
  typical_tickers: string[] | null
  preferred_chart_timeframes: string[] | null
  prefers_technical_or_fundamental: string | null
  wants_learning_mode: boolean | null
  trades_per_week: string | null
  risk_per_trade_pct: number | null
  max_daily_loss: number | null
  completed_at: string | null
  skipped: boolean
  created_at: string
  updated_at: string
}

// ── Trading Profile (matches DB: trading_profiles) ──

export interface TradingProfile {
  id: string
  user_id: string
  profile_name: string
  is_default: boolean
  is_active: boolean
  seed_style: string | null
  seed_holding_period: string | null
  seed_risk_comfort: string | null
  learned_timeframes: Record<string, unknown>
  learned_instruments: Record<string, unknown>
  learned_indicators: Record<string, unknown>
  style_confidence: number
  created_at: string
  updated_at: string
}

// ── Trading Plan (matches DB: trading_plans) ──

export interface TradingPlan {
  id: string
  user_id: string
  name: string
  is_active: boolean
  // Risk management
  max_risk_per_trade_pct: number | null
  max_daily_loss: number | null
  max_weekly_loss: number | null
  max_monthly_loss: number | null
  max_open_positions: number | null
  max_position_size_usd: number | null
  max_position_size_pct: number | null
  min_risk_reward_ratio: number | null
  max_trades_per_day: number | null
  // Requirements
  require_stop_loss: boolean
  require_take_profit: boolean
  require_thesis: boolean
  // Timing
  allowed_trading_hours_start: string | null
  allowed_trading_hours_end: string | null
  restricted_days: string[] | null
  friday_trading_allowed: boolean
  first_hour_only: boolean
  avoid_first_15_min: boolean
  no_trading_before_major_events: boolean
  // Checklist
  pre_entry_checklist: string[] | null
  // Discipline
  min_time_between_trades_minutes: number | null
  max_consecutive_losses_before_stop: number | null
  no_same_ticker_after_loss: boolean
  cooldown_after_max_loss_hours: number | null
  emotional_checkin_required: boolean
  // Markets
  allowed_asset_types: string[] | null
  blocked_tickers: string[] | null
  max_correlated_positions: number | null
  max_sector_exposure_pct: number | null
  // JSONB rules
  exit_rules: Record<string, unknown>
  session_rules: Record<string, unknown>
  scaling_rules: Record<string, unknown>
  rules_enabled: Record<string, unknown>
  // Notes
  plan_notes: string | null
  template_id: string | null
  // Meta
  created_at: string
  updated_at: string
}

// ── Plan Violations (client-side, not stored in DB yet) ──

export interface PlanViolation {
  violation_type: 'risk' | 'entry' | 'exit' | 'timing' | 'discipline' | 'general'
  rule_text: string
  severity: 'warning' | 'violation'
}

// ── Rule Compliance Stats (from get_plan_compliance_stats RPC) ──

export interface RuleComplianceStat {
  rule_key: string
  times_followed: number
  wins_when_followed: number
  losses_when_followed: number
  pnl_when_followed: number
  wr_when_followed: number
  times_violated: number
  wins_when_violated: number
  losses_when_violated: number
  pnl_when_violated: number
  wr_when_violated: number
  follow_rate: number
  edge: number
}

// ── Behavioral Insights ──

export type InsightCategory =
  | 'win_streak'
  | 'loss_streak'
  | 'overtrading'
  | 'revenge_trading'
  | 'best_setup'
  | 'worst_setup'
  | 'best_time'
  | 'worst_time'
  | 'position_sizing'
  | 'risk_reward'
  | 'hold_time'
  | 'ticker_concentration'

export interface BehavioralInsight {
  id: string
  category: InsightCategory
  title: string
  description: string
  severity: 'positive' | 'neutral' | 'warning' | 'critical'
  data: Record<string, unknown>
  actionable: string | null
  created_at: string
}

// ── Milestones ──

export interface MilestoneDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: 'trades' | 'profit' | 'discipline' | 'learning' | 'streak'
  threshold: number
  unit: string
}

export interface MilestoneProgress {
  milestone: MilestoneDefinition
  current: number
  completed: boolean
  completed_at: string | null
  progress_percent: number
}

// ── Playbook (matches DB: playbooks) ──
// Migration needed for new columns:
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS market_type text DEFAULT 'all';
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS instruments text[];
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS notes text;
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS ai_summary text;
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS last_graded_at timestamptz;
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS profit_factor numeric;
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS expectancy numeric;
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS best_trade_pnl numeric;
//   ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS worst_trade_pnl numeric;

export interface Playbook {
  id: string
  user_id: string
  name: string
  description: string | null
  setup_type: string
  timeframe: string | null
  market_conditions: string | null
  entry_rules: string | null  // text, not array
  exit_rules: string | null   // text, not array
  risk_rules: string | null   // text, not array
  checklist: string[]
  total_trades: number
  winning_trades: number
  avg_r_multiple: number | null
  avg_pnl_percent: number | null
  win_rate: number | null
  is_active: boolean
  market_type: string          // 'stocks' | 'forex' | 'crypto' | 'futures' | 'all'
  instruments: string[] | null // specific tickers this playbook applies to
  notes: string | null
  ai_summary: string | null    // Pelican's latest analysis
  last_graded_at: string | null
  display_order: number
  profit_factor: number | null
  expectancy: number | null
  best_trade_pnl: number | null
  worst_trade_pnl: number | null
  // Strategy template fields
  is_curated: boolean
  is_published: boolean
  published_at: string | null
  slug: string | null
  forked_from: string | null
  fork_depth: number
  category: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  recommended_assets: string[] | null
  best_when: string | null
  avoid_when: string | null
  author_display_name: string | null
  adoption_count: number
  community_rating: number | null
  rating_count: number
  stats_verified: boolean
  stats_verified_at: string | null
  stats_trade_count: number
  has_backtest: boolean
  created_at: string
  updated_at: string
}

export type StrategyCategory = 'momentum' | 'mean_reversion' | 'event_driven' | 'options'
export type StrategyDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type StrategySource = 'all' | 'curated' | 'community'

export interface StrategyFilter {
  source: StrategySource
  category: StrategyCategory | 'all'
  difficulty: StrategyDifficulty | 'all'
  search: string
  sortBy: 'popular' | 'rating' | 'newest'
}

export interface StrategyRating {
  id: string
  user_id: string
  playbook_id: string
  rating: number
  review: string | null
  created_at: string
  updated_at: string
}

export interface TemplateAdoption {
  id: string
  user_id: string
  source_playbook_id: string
  adopted_playbook_id: string
  created_at: string
}

export interface StrategyBacktestResult {
  id: string
  playbook_id: string
  universe: string
  lookback_period: string
  total_trades: number
  win_rate: number | null
  profit_factor: number | null
  max_drawdown_pct: number | null
  sharpe_ratio: number | null
  avg_r_multiple: number | null
  equity_curve: Array<{ date: string; value: number }> | null
  notes: string | null
  calculated_at: string
  created_at: string
}
