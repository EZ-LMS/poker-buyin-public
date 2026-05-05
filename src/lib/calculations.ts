import type { PlayerWithBuyIns } from './supabase'

export type PlayerSettlement = {
  player: PlayerWithBuyIns
  totalBuyIn: number
  totalPaid: number
  totalUnpaid: number
  finalChips: number
  netTransfer: number // positive = dealer pays player, negative = player pays dealer
}

export function calcSettlement(player: PlayerWithBuyIns): PlayerSettlement | null {
  if (player.final_chips === null) return null

  const totalBuyIn = player.buy_ins.reduce((s, b) => s + Number(b.amount), 0)
  const totalPaid = player.buy_ins.filter(b => b.paid).reduce((s, b) => s + Number(b.amount), 0)
  const totalUnpaid = totalBuyIn - totalPaid
  const finalChips = Number(player.final_chips)
  const netTransfer = finalChips - totalUnpaid

  return { player, totalBuyIn, totalPaid, totalUnpaid, finalChips, netTransfer }
}

export function checkBalance(players: PlayerWithBuyIns[]): {
  totalChips: number
  totalBuyIns: number
  balanced: boolean
  diff: number
} {
  const totalChips = players.reduce((s, p) => s + (p.final_chips ? Number(p.final_chips) : 0), 0)
  const totalBuyIns = players.reduce(
    (s, p) => s + p.buy_ins.reduce((bs, b) => bs + Number(b.amount), 0),
    0
  )
  const diff = totalChips - totalBuyIns
  return { totalChips, totalBuyIns, balanced: Math.abs(diff) < 0.01, diff }
}
