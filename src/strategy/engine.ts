/**
 * Strategy Engine — Main bar-by-bar strategy processor.
 * 
 * Orchestrates rule evaluation, trade simulation, and result collection.
 * Supports both backtest (full dataset at once) and forward test (tick-by-tick).
 */

import { KLineData } from 'klinecharts'
import type {
  StrategyConfig, BacktestResults, StrategyEvent,
  StrategyEventType, Trade
} from './types'
import { evaluateRuleGroup, collectIndicatorResults } from './rule-evaluator'
import { TradeSimulator } from './trade-simulator'
import { calculateMetrics } from './metrics'

export type StrategyEventCallback = (event: StrategyEvent) => void

// ──────────────────────────────────────────────
// Strategy Engine Class
// ──────────────────────────────────────────────

export class StrategyEngine {
  private _config: StrategyConfig
  private _simulator: TradeSimulator
  private _prevBar: KLineData | null = null
  private _prevIndicators: Map<string, any> = new Map()
  private _eventCallback: StrategyEventCallback | null = null
  private _barIndex = 0

  constructor (config: StrategyConfig) {
    this._config = config
    this._simulator = new TradeSimulator(config)
  }

  /** Set a callback for real-time events (forward test) */
  setEventCallback (callback: StrategyEventCallback): void {
    this._eventCallback = callback
  }

  // ──────────────────────────────────────────
  // Backtest Mode — Fast, process all bars
  // ──────────────────────────────────────────

  /**
   * Run a full backtest on the given dataset.
   * 
   * @param dataList - Full OHLCV data array
   * @param indicatorData - Map of indicator name → full result array
   * @param symbolName - Symbol ticker for results metadata
   * @param periodText - Period text for results metadata
   */
  runBacktest (
    dataList: KLineData[],
    indicatorData: Map<string, any[]>,
    symbolName: string = '',
    periodText: string = ''
  ): BacktestResults {
    const startTime = performance.now()

    // Reset state
    this._simulator.reset()
    this._simulator.setDataList(dataList)
    this._prevBar = null
    this._prevIndicators = new Map()
    this._barIndex = 0

    // Process each bar
    for (let i = 0; i < dataList.length; i++) {
      const bar = dataList[i]
      
      if (this._config.backtestRange) {
        if (bar.timestamp < this._config.backtestRange.from || bar.timestamp > this._config.backtestRange.to) {
          continue
        }
      }

      const indicators = collectIndicatorResults(indicatorData, i)
      
      this.processTick(i, bar, indicators)
    }

    // Close any remaining open positions at end of data
    if (dataList.length > 0) {
      const lastBar = dataList[dataList.length - 1]
      this._simulator.closeAll(lastBar, dataList.length - 1, 'end_of_data')
    }

    const executionTime = performance.now() - startTime

    // Collect results
    const trades = this._simulator.getClosedTrades()
    const equityCurve = this._simulator.getEquityCurve()
    const metrics = calculateMetrics(trades, this._config.initialCapital, equityCurve)

    return {
      strategyName: this._config.name,
      symbol: symbolName,
      period: periodText,
      dateRange: {
        from: this._config.backtestRange ? this._config.backtestRange.from : (dataList.length > 0 ? dataList[0].timestamp : 0),
        to: this._config.backtestRange ? this._config.backtestRange.to : (dataList.length > 0 ? dataList[dataList.length - 1].timestamp : 0)
      },
      config: this._config,
      trades,
      metrics,
      equityCurve,
      executionTime
    }
  }

  // ──────────────────────────────────────────
  // Forward Test Mode — Tick-by-tick
  // ──────────────────────────────────────────

  /**
   * Initialize for forward test mode.
   * Call processTick() for each new bar.
   */
  initForwardTest (dataList: KLineData[]): void {
    this._simulator.reset()
    this._simulator.setDataList(dataList)
    this._prevBar = null
    this._prevIndicators = new Map()
    this._barIndex = 0
  }

  /**
   * Process a single bar tick. Used by both backtest loop and forward test.
   * Returns list of events that occurred on this bar.
   */
  processTick (
    barIndex: number,
    bar: KLineData,
    indicators: Map<string, any>
  ): StrategyEvent[] {
    const events: StrategyEvent[] = []
    this._barIndex = barIndex

    // 1. Update trailing stops
    this._simulator.updateTrailingStops(bar)

    // 2. Check stop losses
    const slTrades = this._simulator.checkStopLosses(bar, barIndex)
    for (const trade of slTrades) {
      const event = this.createEvent(
        trade.exitReason === 'trailing_stop' ? 'trailing_stop' : 'stop_loss',
        barIndex, trade.exitPrice ?? bar.close, bar.timestamp, trade
      )
      events.push(event)
    }

    // 3. Check take profits
    const tpTrades = this._simulator.checkTakeProfits(bar, barIndex)
    for (const trade of tpTrades) {
      const event = this.createEvent('take_profit',
        barIndex, trade.exitPrice ?? bar.close, bar.timestamp, trade
      )
      events.push(event)
    }

    // 4. Check exit rules (only if we have open positions)
    if (this._simulator.hasOpenPosition() && this._config.mode === 'visual') {
      // Check long exit
      if (this._simulator.hasOpenPosition('long') && this._config.longExit) {
        const shouldExit = evaluateRuleGroup(
          this._config.longExit, bar, this._prevBar,
          indicators, this._prevIndicators
        )
        if (shouldExit) {
          const positions = this._simulator.getOpenPositions()
            .filter(t => t.direction === 'long')
          for (const pos of positions) {
            const trade = this._simulator.closePosition(pos.id, bar, barIndex, 'signal')
            if (trade) {
              events.push(this.createEvent('exit_long', barIndex, bar.close, bar.timestamp, trade))
            }
          }
        }
      }

      // Check short exit
      if (this._simulator.hasOpenPosition('short') && this._config.shortExit) {
        const shouldExit = evaluateRuleGroup(
          this._config.shortExit, bar, this._prevBar,
          indicators, this._prevIndicators
        )
        if (shouldExit) {
          const positions = this._simulator.getOpenPositions()
            .filter(t => t.direction === 'short')
          for (const pos of positions) {
            const trade = this._simulator.closePosition(pos.id, bar, barIndex, 'signal')
            if (trade) {
              events.push(this.createEvent('exit_short', barIndex, bar.close, bar.timestamp, trade))
            }
          }
        }
      }
    }

    // 5. Check entry rules (only in visual mode)
    if (this._config.mode === 'visual') {
      // Check long entry
      if (this._config.longEntry && !this._simulator.hasOpenPosition('long')) {
        const shouldEnter = evaluateRuleGroup(
          this._config.longEntry, bar, this._prevBar,
          indicators, this._prevIndicators
        )
        if (shouldEnter) {
          const trade = this._simulator.openPosition('long', bar, barIndex)
          if (trade) {
            events.push(this.createEvent('entry_long', barIndex, bar.close, bar.timestamp, trade))
          }
        }
      }

      // Check short entry
      if (this._config.shortEntry && !this._simulator.hasOpenPosition('short')) {
        const shouldEnter = evaluateRuleGroup(
          this._config.shortEntry, bar, this._prevBar,
          indicators, this._prevIndicators
        )
        if (shouldEnter) {
          const trade = this._simulator.openPosition('short', bar, barIndex)
          if (trade) {
            events.push(this.createEvent('entry_short', barIndex, bar.close, bar.timestamp, trade))
          }
        }
      }
    }

    // 6. Record equity
    this._simulator.recordEquity(barIndex, bar)

    // 7. Emit events
    for (const event of events) {
      this._eventCallback?.(event)
    }

    // 8. Store previous bar state for next tick
    this._prevBar = bar
    this._prevIndicators = new Map(indicators)

    return events
  }

  // ──────────────────────────────────────────
  // Getters (for forward test UI)
  // ──────────────────────────────────────────

  getOpenPositions (): Trade[] { return this._simulator.getOpenPositions() }
  getClosedTrades (): Trade[] { return this._simulator.getClosedTrades() }
  getCurrentEquity (): number { return this._simulator.getCurrentEquity() }

  /** Get live results (for forward test) */
  getLiveResults (): BacktestResults {
    const trades = this._simulator.getClosedTrades()
    const equityCurve = this._simulator.getEquityCurve()
    const metrics = calculateMetrics(trades, this._config.initialCapital, equityCurve)

    return {
      strategyName: this._config.name,
      symbol: '',
      period: '',
      dateRange: { from: 0, to: 0 },
      config: this._config,
      trades,
      metrics,
      equityCurve,
      executionTime: 0
    }
  }

  /** Stop forward test — close all positions and return results */
  stopForwardTest (bar: KLineData, barIndex: number): BacktestResults {
    this._simulator.closeAll(bar, barIndex, 'manual')
    return this.getLiveResults()
  }

  reset (): void {
    this._simulator.reset()
    this._prevBar = null
    this._prevIndicators = new Map()
    this._barIndex = 0
  }

  // ──────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────

  private createEvent (
    type: StrategyEventType,
    barIndex: number,
    price: number,
    timestamp: number,
    trade: Trade
  ): StrategyEvent {
    return { type, barIndex, price, timestamp, trade }
  }
}
