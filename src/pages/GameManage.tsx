import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, type Game, type PlayerWithBuyIns } from '../lib/supabase'
import { calcSettlement, checkBalance } from '../lib/calculations'

type Tab = 'players' | 'settlement' | 'qr'

export default function GameManage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<PlayerWithBuyIns[]>([])
  const [tab, setTab] = useState<Tab>('players')
  const [loading, setLoading] = useState(true)
  const [finalInputs, setFinalInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [forceDialogOpen, setForceDialogOpen] = useState(false)
  const [forceNote, setForceNote] = useState('')
  const [forcing, setForcing] = useState(false)

  const joinUrl = `${window.location.origin}/game/${id}/join`

  const loadData = useCallback(async () => {
    if (!id) return
    const [{ data: gameData }, { data: playersData }] = await Promise.all([
      supabase.from('games').select('*').eq('id', id).single(),
      supabase
        .from('game_players')
        .select('*, buy_ins(*)')
        .eq('game_id', id)
        .order('created_at', { ascending: true }),
    ])
    if (gameData) setGame(gameData)
    if (playersData) setPlayers(playersData as PlayerWithBuyIns[])
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel(`game-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buy_ins' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, loadData])

  async function saveFinalChips() {
    setSaving(true)
    const updates = players
      .filter(p => finalInputs[p.id] !== undefined && finalInputs[p.id] !== '')
      .map(p =>
        supabase
          .from('game_players')
          .update({ final_chips: parseFloat(finalInputs[p.id]) })
          .eq('id', p.id)
      )
    await Promise.all(updates)
    await loadData()
    setSaving(false)
  }

  async function settleGame(opts?: { discrepancy: number; note: string }) {
    if (!id) return
    const update: Record<string, unknown> = { status: 'settled' }
    if (opts) {
      update.settlement_discrepancy = opts.discrepancy
      update.settlement_note = opts.note.trim() || null
    }
    await supabase.from('games').update(update).eq('id', id)
    await loadData()
    setTab('settlement')
  }

  async function confirmForceSettle() {
    if (!balance) return
    setForcing(true)
    await settleGame({ discrepancy: balance.diff, note: forceNote })
    setForcing(false)
    setForceDialogOpen(false)
    setForceNote('')
  }

  const allHaveFinalChips = players.length > 0 && players.every(p => p.final_chips !== null)
  const balance = allHaveFinalChips ? checkBalance(players) : null

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Game not found. <button onClick={() => navigate('/')} className="ml-2 text-emerald-400">Go home</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white text-sm">← Back</button>
        <div className="text-center">
          <div className="font-semibold">
            {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{players.length} player{players.length !== 1 ? 's' : ''}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${game.status === 'settled' ? 'bg-gray-800 text-gray-400' : 'bg-emerald-900 text-emerald-400'}`}>
          {game.status === 'settled' ? 'Settled' : 'In Progress'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(['players', 'settlement', 'qr'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t === 'players' ? 'Players' : t === 'settlement' ? 'Settlement' : 'QR Code'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Players Tab */}
        {tab === 'players' && (
          <div className="space-y-3">
            {players.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">
                No players yet — share the QR code to let people join.
              </p>
            )}
            {players.map(player => {
              const totalBuyIn = player.buy_ins.reduce((s, b) => s + Number(b.amount), 0)
              const totalPaid = player.buy_ins.filter(b => b.paid).reduce((s, b) => s + Number(b.amount), 0)
              return (
                <div key={player.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-white">{player.player_name}</span>
                    <span className="text-sm text-gray-300">Buy-in ${totalBuyIn}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap text-xs">
                    {player.buy_ins.map(b => (
                      <span key={b.id} className={`px-2 py-1 rounded-full ${b.paid ? 'bg-emerald-900 text-emerald-300' : 'bg-yellow-900 text-yellow-300'}`}>
                        ${b.amount} {b.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    ))}
                  </div>
                  {totalBuyIn > totalPaid && (
                    <p className="text-yellow-500 text-xs mt-2">Owes: ${totalBuyIn - totalPaid}</p>
                  )}
                  {game.status === 'active' && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Final chips:</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder={player.final_chips !== null ? String(player.final_chips) : 'Enter amount'}
                        value={finalInputs[player.id] ?? (player.final_chips !== null ? String(player.final_chips) : '')}
                        onChange={e => setFinalInputs(prev => ({ ...prev, [player.id]: e.target.value }))}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                  {game.status === 'settled' && player.final_chips !== null && (
                    <p className="text-gray-400 text-sm mt-2">Final: ${player.final_chips}</p>
                  )}
                </div>
              )
            })}

            {game.status === 'active' && players.length > 0 && (
              <div className="space-y-2 pt-2">
                <button
                  onClick={saveFinalChips}
                  disabled={saving}
                  className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Final Chips'}
                </button>
                {allHaveFinalChips && balance && (
                  <>
                    <button
                      onClick={() => settleGame()}
                      className={`w-full font-semibold py-3 rounded-xl transition-colors ${balance.balanced ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                      disabled={!balance.balanced}
                      title={!balance.balanced ? `Books don't balance — off by $${Math.abs(balance.diff).toFixed(2)}` : ''}
                    >
                      {balance.balanced ? 'Confirm Settlement' : `Books off by $${Math.abs(balance.diff).toFixed(2)}`}
                    </button>
                    {!balance.balanced && (
                      <button
                        onClick={() => setForceDialogOpen(true)}
                        className="w-full bg-orange-700 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        Force Settle ({balance.diff >= 0 ? '+' : '-'}${Math.abs(balance.diff).toFixed(2)})
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Settlement Tab */}
        {tab === 'settlement' && (
          <div className="space-y-3">
            {balance && (
              <div className={`rounded-xl p-3 text-sm text-center ${balance.balanced ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                {balance.balanced ? '✓ Books balanced' : `✗ Off by $${Math.abs(balance.diff).toFixed(2)}`}
                <span className="block text-xs mt-0.5 opacity-70">
                  Total chips ${balance.totalChips} / Total buy-ins ${balance.totalBuyIns}
                </span>
              </div>
            )}
            {players.map(player => {
              const s = calcSettlement(player)
              if (!s) return (
                <div key={player.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-500 text-sm">
                  {player.player_name} — final chips not entered yet
                </div>
              )
              return (
                <div key={player.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{player.player_name}</span>
                    <span className={`font-bold text-lg ${s.netTransfer > 0 ? 'text-emerald-400' : s.netTransfer < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {s.netTransfer > 0 ? `+$${s.netTransfer.toFixed(2)}` : s.netTransfer < 0 ? `-$${Math.abs(s.netTransfer).toFixed(2)}` : 'Even'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                    <div>Bought in ${s.totalBuyIn} (paid ${s.totalPaid} / unpaid ${s.totalUnpaid})</div>
                    <div>Final chips ${s.finalChips}</div>
                    <div className="text-gray-400">
                      {s.netTransfer > 0
                        ? `Host pays ${player.player_name} $${s.netTransfer.toFixed(2)}`
                        : s.netTransfer < 0
                        ? `${player.player_name} pays host $${Math.abs(s.netTransfer).toFixed(2)}`
                        : 'No transfer needed'}
                    </div>
                  </div>
                </div>
              )
            })}
            {players.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No players yet.</p>
            )}
            {game.settlement_discrepancy !== null && (
              <p className="text-xs text-gray-500 text-center pt-2">
                Force settled · off by {Number(game.settlement_discrepancy) >= 0 ? '+' : '-'}${Math.abs(Number(game.settlement_discrepancy)).toFixed(2)}
                {game.settlement_note && ` · ${game.settlement_note}`}
              </p>
            )}
          </div>
        )}

        {/* QR Tab */}
        {tab === 'qr' && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <p className="text-gray-400 text-sm">Players scan this to join the game</p>
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={joinUrl} size={220} />
            </div>
            <p className="text-gray-500 text-xs text-center break-all px-4">{joinUrl}</p>
            <button
              onClick={() => navigator.clipboard.writeText(joinUrl)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Copy Link
            </button>
          </div>
        )}
      </div>

      {forceDialogOpen && balance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !forcing && setForceDialogOpen(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 w-full max-w-sm space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-semibold text-white">Force Settle</h3>
              <p className="text-sm text-gray-400 mt-1">
                Books off by {balance.diff >= 0 ? '+' : '-'}${Math.abs(balance.diff).toFixed(2)}
                <span className="block text-xs mt-1 opacity-70">
                  {balance.diff > 0 ? 'More chips than buy-ins' : 'Fewer chips than buy-ins'} · discrepancy will be saved on the game
                </span>
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Note (optional)</label>
              <textarea
                value={forceNote}
                onChange={e => setForceNote(e.target.value)}
                placeholder="Chip miscount / someone left early with change..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setForceDialogOpen(false)}
                disabled={forcing}
                className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-medium py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmForceSettle}
                disabled={forcing}
                className="flex-1 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {forcing ? 'Settling...' : 'Confirm Force Settle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
