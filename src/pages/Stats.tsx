import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type PlayerWithBuyIns } from '../lib/supabase'
import { calcSettlement } from '../lib/calculations'

type PlayerStat = {
  name: string
  games: number
  totalPL: number
  biggestWin: number
  biggestLoss: number
}

export default function Stats() {
  const [stats, setStats] = useState<PlayerStat[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: settledGames } = await supabase
        .from('games')
        .select('id')
        .eq('status', 'settled')

      if (!settledGames || settledGames.length === 0) {
        setLoading(false)
        return
      }

      const gameIds = settledGames.map(g => g.id)
      const { data: players } = await supabase
        .from('game_players')
        .select('*, buy_ins(*)')
        .in('game_id', gameIds)

      if (!players) { setLoading(false); return }

      const map = new Map<string, PlayerStat>()

      for (const player of players as PlayerWithBuyIns[]) {
        const s = calcSettlement(player)
        if (!s) continue
        const key = player.player_name.toLowerCase()
        const existing = map.get(key) ?? {
          name: player.player_name,
          games: 0,
          totalPL: 0,
          biggestWin: 0,
          biggestLoss: 0,
        }
        const pl = s.finalChips - s.totalBuyIn
        map.set(key, {
          name: existing.name,
          games: existing.games + 1,
          totalPL: existing.totalPL + pl,
          biggestWin: Math.max(existing.biggestWin, pl),
          biggestLoss: Math.min(existing.biggestLoss, pl),
        })
      }

      setStats(Array.from(map.values()).sort((a, b) => b.totalPL - a.totalPL))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto p-4">
      <div className="flex items-center gap-3 pt-6 pb-4">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white text-sm">←</button>
        <h1 className="text-xl font-bold">All-time Leaderboard</h1>
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading...</p>}
      {!loading && stats.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-500">No settled games yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {stats.map((s, i) => (
          <div key={s.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm w-6 text-center font-mono">{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{s.name}</span>
                  <span className={`font-bold text-lg ${s.totalPL > 0 ? 'text-emerald-400' : s.totalPL < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {s.totalPL > 0 ? '+' : ''}{s.totalPL.toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>{s.games} game{s.games !== 1 ? 's' : ''}</span>
                  <span>Best <span className="text-emerald-500">+{s.biggestWin.toFixed(0)}</span></span>
                  <span>Worst <span className="text-red-500">{s.biggestLoss.toFixed(0)}</span></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
