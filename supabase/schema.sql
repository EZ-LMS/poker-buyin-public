-- Poker Home Game Buy-in App Schema
-- Run this in Supabase SQL editor

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'settled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  final_chips NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE buy_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE buy_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Force settlement: record discrepancy when host settles unbalanced books
ALTER TABLE games ADD COLUMN IF NOT EXISTS settlement_discrepancy NUMERIC;
ALTER TABLE games ADD COLUMN IF NOT EXISTS settlement_note TEXT;
