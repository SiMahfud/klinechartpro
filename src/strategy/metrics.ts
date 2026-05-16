/**
 * Metrics Calculator — Performance statistics from trade results.
 * 
 * Calculates win rate, profit factor, Sharpe ratio, max drawdown,
 * expectancy, and other key trading performance metrics.
 */

import type { Trade, EquityPoint, PerformanceMetrics } from './types'

/**
 * Calculate full performance metrics from a list of closed trades.
 */
export function calculateMetrics (
  trades: Trade[],
  initialCapital: number,
  equityCurve: EquityPoint[]
): PerformanceMetrics {
  const closedTrades = trades.filter(t => t.status === 'closed')
  const totalTrades = closedTrades.length

  if (totalTrades === 0) {
    return emptyMetrics()
  }

  // Separate winners and losers
  const winners = closedTrades.filter(t => (t.pnl ?? 0) > 0)
  const losers = closedTrades.filter(t => (t.pnl ?? 0) < 0)
  const breakeven = closedTrades.filter(t => (t.pnl ?? 0) === 0)

  const winningTrades = winners.length
  const losingTrades = losers.length
  const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0

  // P&L aggregates
  const grossProfit = winners.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + (t.pnl ?? 0), 0))
  const netProfit = grossProfit - grossLoss
  const netProfitPercent = initialCapital > 0 ? (netProfit / initialCapital) * 100 : 0
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  // Average win/loss
  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0

  // Largest win/loss
  const largestWin = winners.length > 0
    ? Math.max(...winners.map(t => t.pnl ?? 0))
    : 0
  const largestLoss = losers.length > 0
    ? Math.abs(Math.min(...losers.map(t => t.pnl ?? 0)))
    : 0

  // Expectancy
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss)

  // Max Drawdown from equity curve
  let maxDrawdown = 0
  let maxDrawdownPercent = 0
  if (equityCurve.length > 0) {
    maxDrawdown = Math.max(...equityCurve.map(p => p.drawdown))
    maxDrawdownPercent = Math.max(...equityCurve.map(p => p.drawdownPercent))
  }

  // Consecutive wins/losses
  const { maxConsecutiveWins, maxConsecutiveLosses } = calculateStreaks(closedTrades)

  // Sharpe Ratio
  const sharpeRatio = calculateSharpeRatio(closedTrades)

  // Average trade duration
  const { avgDurationBars, avgDurationMs } = calculateAvgDuration(closedTrades)

  // Total costs
  const totalSpreadCost = closedTrades.reduce((sum, t) => sum + t.costs.spread, 0)
  const totalCommissionCost = closedTrades.reduce((sum, t) => sum + t.costs.commission, 0)
  const totalCosts = totalSpreadCost + totalCommissionCost

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,

    netProfit,
    netProfitPercent,
    grossProfit,
    grossLoss,
    profitFactor,

    maxDrawdown,
    maxDrawdownPercent,

    avgWin,
    avgLoss,
    avgRR,
    largestWin,
    largestLoss,

    sharpeRatio,
    expectancy,

    maxConsecutiveWins,
    maxConsecutiveLosses,

    avgTradeDurationBars: avgDurationBars,
    avgTradeDurationMs: avgDurationMs,

    totalCosts,
    totalSpreadCost,
    totalCommissionCost
  }
}

// ──────────────────────────────────────────────
// Internal Calculations
// ──────────────────────────────────────────────

function calculateStreaks (trades: Trade[]): {
  maxConsecutiveWins: number
  maxConsecutiveLosses: number
} {
  let maxWins = 0, maxLosses = 0
  let currentWins = 0, currentLosses = 0

  for (const trade of trades) {
    const pnl = trade.pnl ?? 0
    if (pnl > 0) {
      currentWins++
      currentLosses = 0
      maxWins = Math.max(maxWins, currentWins)
    } else if (pnl < 0) {
      currentLosses++
      currentWins = 0
      maxLosses = Math.max(maxLosses, currentLosses)
    } else {
      // Breakeven resets both streaks
      currentWins = 0
      currentLosses = 0
    }
  }

  return { maxConsecutiveWins: maxWins, maxConsecutiveLosses: maxLosses }
}

function calculateSharpeRatio (trades: Trade[]): number {
  if (trades.length < 2) return 0

  const returns = trades.map(t => t.pnl ?? 0)
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1)
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) return 0
  
  // Annualized Sharpe (assuming ~252 trading days)
  // Since we don't know the exact trading frequency, we use per-trade Sharpe
  return mean / stdDev
}

function calculateAvgDuration (trades: Trade[]): {
  avgDurationBars: number
  avgDurationMs: number
} {
  const tradesWithExit = trades.filter(t => t.exitBar !== undefined)
  if (tradesWithExit.length === 0) {
    return { avgDurationBars: 0, avgDurationMs: 0 }
  }

  const totalBars = tradesWithExit.reduce((sum, t) => sum + ((t.exitBar ?? 0) - t.entryBar), 0)
  const totalMs = tradesWithExit.reduce((sum, t) => sum + ((t.exitTime ?? 0) - t.entryTime), 0)

  return {
    avgDurationBars: totalBars / tradesWithExit.length,
    avgDurationMs: totalMs / tradesWithExit.length
  }
}

function emptyMetrics (): PerformanceMetrics {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    netProfit: 0,
    netProfitPercent: 0,
    grossProfit: 0,
    grossLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    avgWin: 0,
    avgLoss: 0,
    avgRR: 0,
    largestWin: 0,
    largestLoss: 0,
    sharpeRatio: 0,
    expectancy: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    avgTradeDurationBars: 0,
    avgTradeDurationMs: 0,
    totalCosts: 0,
    totalSpreadCost: 0,
    totalCommissionCost: 0
  }
}
