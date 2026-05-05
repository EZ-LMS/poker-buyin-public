import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, type Game, type PlayerWithBuyIns } from '../lib/supabase'

type Step = 'identify' | 'confirm_existing' | 'buyin' | 'done'

export default function JoinGame() {
  const { id } = useParams<{ id: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [step, setStep] = useState<Step>('identify')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [paid, setPaid] = useState(true)
  const [player, setPlayer] = useState<PlayerWithBuyIns | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    supabase.from('games').select('*').eq('id', id).single().then(({ data }) => {
      setGame(data)
      setLoading(false)
    })
  }, [id])

  async function findOrJoin() {
    if (!name.trim() || !id) return
    setError('')
    setSubmitting(true)

    const { data: existing } = await supabase
      .from('game_players')
      .select('*, buy_ins(*)')
      .eq('game_id', id)
      .ilike('player_name', name.trim())
      .maybeSingle()

    setSubmitting(false)

    if (existing) {
      setPlayer(existing as PlayerWithBuyIns)
      setStep('confirm_existing')
    } else {
      setPlayer(null)
      setStep('buyin')
    }
  }

  async function submitBuyIn() {
    if (!amount || parseFloat(amount) <= 0 || !id) return
    setError('')
    setSubmitting(true)

    let playerId = player?.id

    if (!playerId) {
      const { data: newPlayer, error: pe } = await supabase
        .from('game_players')
        .insert({ game_id: id, player_name: name.trim() })
        .select('*, buy_ins(*)')
        .single()

      if (pe || !newPlayer) {
        setError('Failed to create player. Please try again.')
        setSubmitting(false)
        return
      }
      playerId = newPlayer.id
      setPlayer(newPlayer as PlayerWithBuyIns)
    }

    const { error: be } = await supabase
      .from('buy_ins')
      .insert({ game_player_id: playerId, amount: parseFloat(amount), paid })

    if (be) {
      setError('Failed to add buy-in. Please try again.')
      setSubmitting(false)
      return
    }

    const { data: updated } = await supabase
      .from('game_players')
      .select('*, buy_ins(*)')
      .eq('id', playerId)
      .single()

    if (updated) setPlayer(updated as PlayerWithBuyIns)
    setAmount('')
    setPaid(false)
    setStep('done')
    setSubmitting(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  }

  if (!game) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Game not found.</div>
  }

  if (game.status === 'settled') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center p-4">
        <div>
          <div className="text-4xl mb-3">🏁</div>
          <h1 className="text-white text-xl font-semibold">Game already settled</h1>
          <p className="text-gray-400 text-sm mt-2">This game has ended — no more buy-ins.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col max-w-sm mx-auto p-4">
      {/* Header */}
      <div className="pt-8 pb-6 text-center">
        <div className="text-3xl mb-2">🃏</div>
        <h1 className="text-xl font-bold">Join Game</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Step: enter name */}
      {step === 'identify' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Your name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && findOrJoin()}
              autoFocus
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={findOrJoin}
            disabled={!name.trim() || submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
          >
            {submitting ? 'Checking...' : 'Continue'}
          </button>
        </div>
      )}

      {/* Step: confirm existing player */}
      {step === 'confirm_existing' && player && (
        <div className="flex flex-col gap-4">
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">👋</div>
            <p className="text-yellow-300 font-semibold">"{player.player_name}" is already in this game</p>
            <p className="text-yellow-500 text-sm mt-1">
              {player.buy_ins.length} buy-in{player.buy_ins.length !== 1 ? 's' : ''} · $
              {player.buy_ins.reduce((s, b) => s + Number(b.amount), 0)} total
            </p>
          </div>

          <p className="text-gray-300 text-sm text-center">Is this you?</p>

          <button
            onClick={() => setStep('buyin')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
          >
            Yes, that's me — add buy-in
          </button>

          <button
            onClick={() => {
              setPlayer(null)
              setName('')
              setStep('identify')
            }}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors"
          >
            No, I'm a different player
          </button>
        </div>
      )}

      {/* Step: buy-in form */}
      {step === 'buyin' && (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <span className="text-gray-400 text-sm">Player: </span>
            <span className="font-semibold">{name}</span>
            {player && (
              <span className="block text-gray-500 text-xs mt-0.5">
                {player.buy_ins.length} existing buy-in{player.buy_ins.length !== 1 ? 's' : ''} · $
                {player.buy_ins.reduce((s, b) => s + Number(b.amount), 0)} total
              </span>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Buy-in amount (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="20"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-white text-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {[20, 40, 60, 100].map(v => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${amount === String(v) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                ${v}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={paid}
              onChange={e => setPaid(e.target.checked)}
              className="w-5 h-5 rounded accent-emerald-500"
            />
            <div>
              <div className="font-medium">Already paid the host</div>
              <div className="text-xs text-gray-500">First buy-in is usually paid upfront</div>
            </div>
          </label>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={submitBuyIn}
            disabled={!amount || parseFloat(amount) <= 0 || submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
          >
            {submitting ? 'Submitting...' : `Confirm Buy-in $${amount || '0'}`}
          </button>

          <button
            onClick={() => setStep('identify')}
            className="text-gray-500 text-sm text-center"
          >
            ← Change name
          </button>
        </div>
      )}

      {/* Step: done */}
      {step === 'done' && player && (
        <div className="flex flex-col gap-4">
          <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">✓</div>
            <p className="text-emerald-400 font-semibold">Buy-in recorded!</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">{player.player_name}'s record</h3>
            <div className="space-y-2">
              {player.buy_ins.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Buy-in #{i + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">${b.amount}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.paid ? 'bg-emerald-900 text-emerald-400' : 'bg-yellow-900 text-yellow-400'}`}>
                      {b.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>${player.buy_ins.reduce((s, b) => s + Number(b.amount), 0)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setAmount('')
              setPaid(false)
              setStep('buyin')
            }}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            + Add another buy-in
          </button>
        </div>
      )}
    </div>
  )
}
