import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type Game } from '../lib/supabase'

export default function Home() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setGames(data ?? [])
        setLoading(false)
      })
  }, [])

  async function createGame() {
    setCreating(true)
    const { data, error } = await supabase
      .from('games')
      .insert({ date: new Date().toISOString().slice(0, 10) })
      .select()
      .single()
    if (!error && data) navigate(`/game/${data.id}`)
    setCreating(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-lg mx-auto">
      <div className="pt-8 pb-6">
        <div className="text-3xl mb-1">🃏</div>
        <h1 className="text-2xl font-bold text-white">Poker Buy-in</h1>
        <p className="text-gray-400 text-sm mt-1">Home Game Manager</p>
      </div>

      <button
        onClick={createGame}
        disabled={creating}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-lg mb-6 transition-colors"
      >
        {creating ? 'Creating...' : '+ New Game'}
      </button>

      <div className="space-y-3">
        <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Game History</h2>
        {loading && <p className="text-gray-500 text-sm">Loading...</p>}
        {!loading && games.length === 0 && (
          <p className="text-gray-600 text-sm">No games yet — start your first one!</p>
        )}
        {games.map(game => (
          <button
            key={game.id}
            onClick={() => navigate(`/game/${game.id}`)}
            className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-4 text-left transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">
                  {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(game.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  game.status === 'settled'
                    ? 'bg-gray-800 text-gray-400'
                    : 'bg-emerald-900 text-emerald-400'
                }`}
              >
                {game.status === 'settled' ? 'Settled' : 'In Progress'}
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/stats')}
        className="w-full mt-6 text-gray-500 hover:text-gray-300 text-sm py-3 transition-colors"
      >
        All-time Leaderboard →
      </button>
    </div>
  )
}
