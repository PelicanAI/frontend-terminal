-- SnapTrade broker connections table
CREATE TABLE IF NOT EXISTS broker_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snaptrade_user_id TEXT NOT NULL,
  snaptrade_user_secret TEXT NOT NULL,
  brokerage_authorization_id TEXT,
  brokerage_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'error')),
  last_synced_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, brokerage_authorization_id)
);

-- RLS
ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON broker_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON broker_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON broker_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON broker_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Add broker sync columns to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS broker_connection_id UUID REFERENCES broker_connections(id);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS snaptrade_symbol_id TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS broker_fields_locked BOOLEAN DEFAULT false;
