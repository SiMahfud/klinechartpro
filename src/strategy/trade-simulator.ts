/**
 * Trade Simulator — Position management, P&L, and cost calculation.
 * 
 * Manages open positions, calculates stop loss/take profit levels,
 * handles trailing stops, and computes P&L including optional
 * spread and commission costs.
 */

import { KLineData } from 'klinecharts'
import type {
  StrategyConfig, Trade, TradeDirection, ExitReason,
  EquityPoint, StopLossConfig, TakeProfitConfig
} from './types'

let _tradeIdCounter = 0

function generateTradeId (): string {
  return `trade_${++_tradeIdCounter}_${Date.now()}`
}

// ──────────────────────────────────────────────
// ATR Helper (for ATR-based SL/TP)
// ──────────────────────────────────────────────

function calculateATR (dataList: KLineData[], index: number, period: number = 14): number {
  if (index < 1) return 0
  const start = Math.max(0, index - period)
  let sum = 0
  let count = 0
  for (let i = start + 1; i <= index; i++) {
    const tr = Math.max(
      dataList[i].high - dataList[i].low,
      Math.abs(dataList[i].high - dataList[i - 1].close),
      Math.abs(dataList[i].low - dataList[i - 1].close)
    )
    sum += tr
    count++
  }
  return count > 0 ? sum / count : 0
}

// ──────────────────────────────────────────────
// Trade Simulator Class
// ──────────────────────────────────────────────

export class TradeSimulator {
  private _config: StrategyConfig
  private _openPositions: Trade[] = []
  private _closedTrades: Trade[] = []
  private _equity: number
  private _peakEquity: number
  private _equityCurve: EquityPoint[] = []
  private _dataList: KLineData[] = []

  constructor (config: StrategyConfig) {
    this._config = config
    this._equity = config.initialCapital
    this._peakEquity = config.initialCapital
    _tradeIdCounter = 0
  }

  /** Set the full data list (needed for ATR calculations) */
  setDataList (dataList: KLineData[]): void {
    this._dataList = dataList
  }

  // ──────────────────────────────────────────
  // Position Management
  // ──────────────────────────────────────────

  /** Open a new position */
  openPosition (
    direction: TradeDirection,
    bar: KLineData,
    barIndex: number,
    indicators?: Map<string, any>
  ): Trade | null {
    // Check max open trades
    if (this._openPositions.length >= this._config.maxOpenTrades) {
      return null
    }

    // Check if we already have a position in same direction
    const existing = this._openPositions.find(t => t.direction === direction)
    if (existing) return null

    const entryPrice = bar.close
    const lotSize = this._config.lotSize

    // Calculate costs
    const spreadCost = this.calculateSpreadCost(entryPrice)
    const commissionCost = this.calculateCommission()

    // Calculate SL/TP levels
    const atr = calculateATR(this._dataList, barIndex)
    const stopLossPrice = this.calculateStopLossPrice(direction, entryPrice, atr)
    const takeProfitPrice = this.calculateTakeProfitPrice(direction, entryPrice, atr, stopLossPrice)

    const trade: Trade = {
      id: generateTradeId(),
      direction,
      status: 'open',
      entryBar: barIndex,
      entryPrice,
      entryTime: bar.timestamp,
      lotSize,
      costs: {
        spread: spreadCost,
        commission: commissionCost,
        total: spreadCost + commissionCost
      },
      stopLossPrice,
      takeProfitPrice,
      trailingStopPrice: undefined,
      trailingActivated: false,
      maxFavorablePrice: entryPrice
    }

    this._openPositions.push(trade)
    // Deduct entry costs from equity
    this._equity -= trade.costs.total

    // SR Zone Percent SL override: place SL at X% outside zone edge
    if (this._config.stopLoss.type === 'sr_zone_percent' && indicators) {
      const mtfsr = indicators.get('MTFSR')
      const pct = this._config.stopLoss.value / 100  // e.g. 20 → 0.20

      if (direction === 'long' && mtfsr?.supportZoneBottom != null && mtfsr?.supportZoneWidth != null) {
        // SL below support zone bottom by pct of zone width
        trade.stopLossPrice = mtfsr.supportZoneBottom - (mtfsr.supportZoneWidth * pct)
      } else if (direction === 'short' && mtfsr?.resistanceZoneTop != null && mtfsr?.resistanceZoneWidth != null) {
        // SL above resistance zone top by pct of zone width
        trade.stopLossPrice = mtfsr.resistanceZoneTop + (mtfsr.resistanceZoneWidth * pct)
      }

      // Recalculate TP based on new SL distance (RR ratio)
      if (trade.stopLossPrice != null) {
        const slDist = Math.abs(entryPrice - trade.stopLossPrice)
        const tp = this._config.takeProfit
        const rrMultiplier = tp.type === 'rr_ratio' ? tp.value : 1.0
        trade.takeProfitPrice = direction === 'long'
          ? entryPrice + slDist * rrMultiplier
          : entryPrice - slDist * rrMultiplier
      }
    }

    return trade
  }

  /** Close a position */
  closePosition (
    tradeId: string,
    bar: KLineData,
    barIndex: number,
    reason: ExitReason
  ): Trade | null {
    const idx = this._openPositions.findIndex(t => t.id === tradeId)
    if (idx === -1) return null

    const trade = this._openPositions[idx]
    const exitPrice = bar.close

    // Calculate P&L
    const priceDiff = trade.direction === 'long'
      ? exitPrice - trade.entryPrice
      : trade.entryPrice - exitPrice

    const pipValue = this._config.costs.pipValue || 1
    const pnlPips = priceDiff / this.getPipSize()
    const pnl = pnlPips * trade.lotSize * pipValue - trade.costs.total

    trade.exitBar = barIndex
    trade.exitPrice = exitPrice
    trade.exitTime = bar.timestamp
    trade.exitReason = reason
    trade.status = 'closed'
    trade.pnl = pnl
    trade.pnlPercent = (pnl / this._config.initialCapital) * 100
    trade.pnlPips = pnlPips

    // Update equity
    this._equity += pnl + trade.costs.total  // add back costs since pnl already includes them
    this._equity += pnlPips * trade.lotSize * pipValue

    // Remove from open, add to closed
    this._openPositions.splice(idx, 1)
    this._closedTrades.push(trade)

    return trade
  }

  /** Close all open positions */
  closeAll (bar: KLineData, barIndex: number, reason: ExitReason): Trade[] {
    const closed: Trade[] = []
    // Copy array since we're modifying it
    const positions = [...this._openPositions]
    for (const pos of positions) {
      const trade = this.closePosition(pos.id, bar, barIndex, reason)
      if (trade) closed.push(trade)
    }
    return closed
  }

  // ──────────────────────────────────────────
  // SL / TP / Trailing
  // ──────────────────────────────────────────

  /** Check and execute stop losses for all open positions */
  checkStopLosses (bar: KLineData, barIndex: number): Trade[] {
    const stopped: Trade[] = []
    const positions = [...this._openPositions]
    
    for (const trade of positions) {
      const slPrice = trade.trailingStopPrice ?? trade.stopLossPrice
      if (slPrice === undefined) continue

      let hit = false
      if (trade.direction === 'long') {
        hit = bar.low <= slPrice
      } else {
        hit = bar.high >= slPrice
      }

      if (hit) {
        // Override exit price to SL price (not bar close)
        const exitTrade = this.closePosition(trade.id, bar, barIndex,
          trade.trailingActivated ? 'trailing_stop' : 'stop_loss')
        if (exitTrade) {
          exitTrade.exitPrice = slPrice
          // Recalculate P&L with SL price
          this.recalculatePnL(exitTrade)
          stopped.push(exitTrade)
        }
      }
    }
    return stopped
  }

  /** Check and execute take profits for all open positions */
  checkTakeProfits (bar: KLineData, barIndex: number): Trade[] {
    const taken: Trade[] = []
    const positions = [...this._openPositions]
    
    for (const trade of positions) {
      if (trade.takeProfitPrice === undefined) continue

      let hit = false
      if (trade.direction === 'long') {
        hit = bar.high >= trade.takeProfitPrice
      } else {
        hit = bar.low <= trade.takeProfitPrice
      }

      if (hit) {
        const exitTrade = this.closePosition(trade.id, bar, barIndex, 'take_profit')
        if (exitTrade) {
          exitTrade.exitPrice = trade.takeProfitPrice
          this.recalculatePnL(exitTrade)
          taken.push(exitTrade)
        }
      }
    }
    return taken
  }

  /** Update trailing stops for all open positions */
  updateTrailingStops (bar: KLineData): void {
    const trailing = this._config.trailingStop
    if (!trailing?.enabled) return

    const pipSize = this.getPipSize()

    for (const trade of this._openPositions) {
      if (trade.direction === 'long') {
        // Track highest price
        trade.maxFavorablePrice = Math.max(trade.maxFavorablePrice ?? trade.entryPrice, bar.high)
        
        // Check activation
        const profitPips = (trade.maxFavorablePrice - trade.entryPrice) / pipSize
        if (profitPips >= trailing.activationPips) {
          trade.trailingActivated = true
          const newTrailPrice = trade.maxFavorablePrice - (trailing.trailPips * pipSize)
          trade.trailingStopPrice = Math.max(
            trade.trailingStopPrice ?? 0,
            newTrailPrice
          )
        }
      } else {
        // Short: track lowest price
        trade.maxFavorablePrice = Math.min(
          trade.maxFavorablePrice ?? trade.entryPrice,
          bar.low
        )
        
        const profitPips = (trade.entryPrice - trade.maxFavorablePrice) / pipSize
        if (profitPips >= trailing.activationPips) {
          trade.trailingActivated = true
          const newTrailPrice = trade.maxFavorablePrice + (trailing.trailPips * pipSize)
          trade.trailingStopPrice = trade.trailingStopPrice
            ? Math.min(trade.trailingStopPrice, newTrailPrice)
            : newTrailPrice
        }
      }
    }
  }

  // ──────────────────────────────────────────
  // Equity Tracking
  // ──────────────────────────────────────────

  /** Record equity point for current bar */
  recordEquity (barIndex: number, bar: KLineData): void {
    // Calculate unrealized P&L from open positions
    let unrealizedPnL = 0
    const pipValue = this._config.costs.pipValue || 1
    
    for (const trade of this._openPositions) {
      const priceDiff = trade.direction === 'long'
        ? bar.close - trade.entryPrice
        : trade.entryPrice - bar.close
      const pnlPips = priceDiff / this.getPipSize()
      unrealizedPnL += pnlPips * trade.lotSize * pipValue - trade.costs.total
    }

    const totalEquity = this._equity + unrealizedPnL
    this._peakEquity = Math.max(this._peakEquity, totalEquity)

    const drawdown = this._peakEquity - totalEquity
    const drawdownPercent = this._peakEquity > 0
      ? (drawdown / this._peakEquity) * 100
      : 0

    this._equityCurve.push({
      barIndex,
      timestamp: bar.timestamp,
      equity: totalEquity,
      drawdown,
      drawdownPercent
    })
  }

  // ──────────────────────────────────────────
  // Cost Calculation
  // ──────────────────────────────────────────

  calculateSpreadCost (price: number): number {
    if (!this._config.costs.includeSpread) return 0
    const pipValue = this._config.costs.pipValue || 1
    return this._config.costs.spreadPips * this._config.lotSize * pipValue
  }

  calculateCommission (): number {
    if (!this._config.costs.includeCommission) return 0
    return this._config.costs.commissionPerLot * this._config.lotSize
  }

  // ──────────────────────────────────────────
  // Getters
  // ──────────────────────────────────────────

  getOpenPositions (): Trade[] { return [...this._openPositions] }
  getClosedTrades (): Trade[] { return [...this._closedTrades] }
  getEquityCurve (): EquityPoint[] { return [...this._equityCurve] }
  getCurrentEquity (): number { return this._equity }
  getOpenCount (): number { return this._openPositions.length }

  /** Check if we have an open position in a given direction */
  hasOpenPosition (direction?: TradeDirection): boolean {
    if (!direction) return this._openPositions.length > 0
    return this._openPositions.some(t => t.direction === direction)
  }

  reset (): void {
    this._openPositions = []
    this._closedTrades = []
    this._equity = this._config.initialCapital
    this._peakEquity = this._config.initialCapital
    this._equityCurve = []
    _tradeIdCounter = 0
  }

  // ──────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────

  private getPipSize (): number {
    // Estimate pip size from the price precision
    // For forex pairs: 0.0001 or 0.01
    // For gold: 0.01
    // For indices: 1
    // Fallback: use price magnitude
    if (this._dataList.length > 0) {
      const price = this._dataList[this._dataList.length - 1].close
      if (price > 1000) return 0.01    // Gold, indices
      if (price > 10) return 0.01      // Major crosses
      return 0.0001                     // Forex
    }
    return 0.0001
  }

  private calculateStopLossPrice (
    direction: TradeDirection,
    entryPrice: number,
    atr: number
  ): number | undefined {
    const sl = this._config.stopLoss
    if (sl.type === 'none') return undefined

    let distance = 0
    const pipSize = this.getPipSize()

    switch (sl.type) {
      case 'fixed_pips':
        distance = sl.value * pipSize
        break
      case 'atr_multiple':
        distance = sl.value * atr
        break
      case 'percent':
        distance = entryPrice * (sl.value / 100)
        break
      case 'sr_zone_percent':
        // Placeholder — actual SL is overridden in openPosition() using zone data
        distance = sl.value * atr || entryPrice * 0.005
        break
    }

    return direction === 'long'
      ? entryPrice - distance
      : entryPrice + distance
  }

  private calculateTakeProfitPrice (
    direction: TradeDirection,
    entryPrice: number,
    atr: number,
    stopLossPrice?: number
  ): number | undefined {
    const tp = this._config.takeProfit
    if (tp.type === 'none') return undefined

    let distance = 0
    const pipSize = this.getPipSize()

    switch (tp.type) {
      case 'fixed_pips':
        distance = tp.value * pipSize
        break
      case 'atr_multiple':
        distance = tp.value * atr
        break
      case 'percent':
        distance = entryPrice * (tp.value / 100)
        break
      case 'rr_ratio':
        // R:R ratio based on stop loss distance
        if (stopLossPrice !== undefined) {
          const slDistance = Math.abs(entryPrice - stopLossPrice)
          distance = slDistance * tp.value
        } else {
          // Fallback to ATR if no SL
          distance = tp.value * atr
        }
        break
    }

    return direction === 'long'
      ? entryPrice + distance
      : entryPrice - distance
  }

  private recalculatePnL (trade: Trade): void {
    if (!trade.exitPrice) return
    const pipValue = this._config.costs.pipValue || 1
    const priceDiff = trade.direction === 'long'
      ? trade.exitPrice - trade.entryPrice
      : trade.entryPrice - trade.exitPrice

    const pnlPips = priceDiff / this.getPipSize()
    trade.pnlPips = pnlPips
    trade.pnl = pnlPips * trade.lotSize * pipValue - trade.costs.total
    trade.pnlPercent = (trade.pnl / this._config.initialCapital) * 100
  }
}
