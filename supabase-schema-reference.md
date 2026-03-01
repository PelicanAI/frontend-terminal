# SUPABASE SCHEMA REFERENCE — Compare Frontend Code Against This

## Custom RPC Functions (filtered, no pgvector/trgm internals)

### Trade Operations
- `close_trade(p_trade_id uuid, p_exit_price numeric, p_exit_date timestamptz DEFAULT now(), p_notes text DEFAULT NULL, p_mistakes text DEFAULT NULL)` → jsonb
- `get_trade_stats(p_start_date timestamptz DEFAULT NULL, p_end_date timestamptz DEFAULT NULL)` → jsonb
- `get_equity_curve()` → jsonb
- `get_pnl_by_day_of_week()` → jsonb
- `get_stats_by_setup()` → jsonb

### Insight RPCs (called by frontend Insights tab)
- `get_all_behavioral_insights(p_user_id uuid)` → jsonb
- `get_calendar_pattern_insights(p_user_id uuid)` → jsonb
- `get_conviction_insights(p_user_id uuid)` → jsonb
- `get_day_of_week_insights(p_user_id uuid)` → jsonb
- `get_holding_period_insights(p_user_id uuid)` → jsonb
- `get_setup_insights(p_user_id uuid)` → jsonb
- `get_sizing_insights(p_user_id uuid)` → jsonb
- `get_streak_insights(p_user_id uuid)` → jsonb
- `get_ticker_insights(p_user_id uuid)` → jsonb
- `get_time_of_day_insights(p_user_id uuid)` → jsonb

### Intelligence Layer RPCs (backend calls these)
- `get_pelican_context(p_user_id uuid, p_include_portfolio bool DEFAULT true, p_include_insights bool DEFAULT true, p_include_warnings bool DEFAULT true, p_include_patterns bool DEFAULT true, p_include_watchlist bool DEFAULT true, p_include_recent_behavior bool DEFAULT true)` → jsonb
- `get_portfolio_summary(p_user_id uuid)` → jsonb
- `get_position_context(p_user_id uuid, p_trade_id uuid)` → jsonb
- `get_position_earnings_warnings(p_user_id uuid)` → jsonb
- `get_todays_warnings(p_user_id uuid)` → jsonb
- `get_ticker_trade_history(p_user_id uuid, p_tickers text[])` → jsonb
- `get_ticker_interests(p_user_id uuid, p_days int DEFAULT 7)` → jsonb
- `detect_and_store_patterns(p_user_id uuid)` → jsonb
- `get_plan_compliance_stats(p_user_id uuid, p_start_date timestamptz DEFAULT NULL, p_end_date timestamptz DEFAULT NULL)` → jsonb

### Credit & Auth RPCs
- `get_user_credits(p_user_id uuid)` → jsonb
- `deduct_credits(p_user_id uuid, p_amount int, p_query_type text)` → jsonb
- `add_credits(p_user_id uuid, p_amount int, p_description text)` → jsonb
- `decrement_free_question(p_user_id uuid)` → jsonb
- `accept_terms()` → void
- `setup_subscriber(p_user_id uuid, p_plan_type text, p_credits int, p_stripe_customer_id text DEFAULT NULL, p_stripe_subscription_id text DEFAULT NULL)` → jsonb
- `cancel_subscription(p_user_id uuid)` → jsonb
- `reset_monthly_credits(p_user_id uuid)` → jsonb

### Streak & Engagement
- `update_streak(p_streak_type text)` → json
- `get_user_engagement(p_user_id uuid)` → TABLE(total_messages, total_conversations, total_trades, total_watchlist, active_playbooks, journal_entries, first_message_at, last_message_at)
- `get_feature_adoption()` → TABLE(feature, user_count, total_count)

### Strategy Templates
- `adopt_template(source_id uuid)` → jsonb
- `publish_playbook(p_playbook_id uuid, p_slug text, p_display_name text)` → jsonb
- `unpublish_playbook(p_playbook_id uuid)` → jsonb

### Admin/Analytics
- `get_daily_message_counts(p_days int DEFAULT 30)` → TABLE(day, user_messages, assistant_messages)
- `get_daily_signups(p_days int DEFAULT 30)` → TABLE(day, signups)
- `get_popular_tickers(p_days int DEFAULT 30, p_limit int DEFAULT 20)` → TABLE(ticker, mention_count)
- `get_popular_tickers_regex(p_days int DEFAULT 30, p_limit int DEFAULT 15)` → TABLE(ticker, mention_count)
- `get_hourly_distribution(p_days int DEFAULT 30)` → TABLE(hour, message_count)
- `get_dow_distribution(p_days int DEFAULT 30)` → TABLE(dow, day_name, message_count)

### Referral/Affiliate
- `validate_referral_code(input_code text)` → jsonb
- `record_referral(p_code text, p_referred_user_id uuid, ...)` → jsonb
- `activate_referral_bonus(p_user_id uuid, p_plan_type text, p_plan_amount numeric)` → jsonb
- `calculate_monthly_commissions(p_period_month date)` → jsonb

### Memory System (used by Fly.io backend)
- `save_conversation_batch(p_user_id uuid, p_session_id text, p_conversation_id text, p_user_message text, p_assistant_message text)` → jsonb
- `get_conversation_messages(p_conversation_id text, p_limit int DEFAULT 30)` → TABLE
- `search_memories_v2(query_embedding vector, match_user_id text, ...)` → TABLE
- `get_or_create_working_context(p_user_id text, p_session_id text DEFAULT 'default')` → text
- `get_context_batch(p_user_id uuid, p_conversation_id uuid, ...)` → jsonb
- `get_user_context_batch(p_user_id uuid, p_conversation_id text, p_max_messages int DEFAULT 50)` → jsonb

### Utility
- `is_admin()` → boolean
- `sync_conversation_tables(p_conversation_id uuid DEFAULT NULL)` → integer

## Key Tables & Column Quick Reference

### trades (37 rows)
CHECK constraints:
- asset_type IN ('stock','option','future','forex','crypto','etf','other')
- direction IN ('long','short')
- status IN ('open','closed','cancelled')
- option_type IN ('call','put',NULL)
- conviction BETWEEN 1 AND 10
- source IN ('manual','chat','import','broker_sync')

### playbooks (20 rows)
Key fields for backtest: market_type (text), instruments (text[]), category, timeframe, setup_type, entry_rules, exit_rules, risk_rules
Curated/published fields: is_curated, is_published, slug, forked_from, adoption_count, community_rating

### behavioral_events (43 rows)
CHECK constraint on event_type — 26 valid values (see audit prompt for full list)

### daily_journal
CHECK constraints:
- market_bias IN ('bullish','bearish','neutral',NULL)
- emotional_state IN ('confident','anxious','frustrated','calm','excited','fearful','neutral',NULL)
UNIQUE constraint: (user_id, journal_date)

### watchlist (8 rows)
CHECK: added_from IN ('manual','chat','trade','onboarding')
Has: alert_price_above, alert_price_below, custom_prompt columns

### user_streaks
CHECK: streak_type IN ('journal','plan')

### trading_plans (1 row)
Massive field set for rule enforcement. Key boolean flags: require_stop_loss, require_take_profit, require_thesis, no_same_ticker_after_loss, emotional_checkin_required, first_hour_only, avoid_first_15_min

### cached_market_data
CHECK: data_type IN ('earnings_calendar','economic_calendar','sp500_prices','top_movers')

### Triggers
- `update_conversation_updated_at` — fires on messages insert
- `update_trades_updated_at` — fires on trades update
- `handle_new_user` — fires on auth.users insert (creates user_credits row)
- `notify_postgrest_schema_reload` — event trigger for schema changes
