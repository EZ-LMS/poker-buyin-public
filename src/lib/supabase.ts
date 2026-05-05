import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Game = {
  id: string
  date: string
  status: 'active' | 'settled'
  settlement_discrepancy: number | null
  settlement_note: string | null
  created_at: string
}

export type GamePlayer = {
  id: string
  game_id: string
  player_name: string
  final_chips: number | null
  created_at: string
}

export type BuyIn = {
  id: string
  game_player_id: string
  amount: number
  paid: boolean
  created_at: string
}

export type PlayerWithBuyIns = GamePlayer & { buy_ins: BuyIn[] }
