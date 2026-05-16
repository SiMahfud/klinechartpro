/**
 * Strategy Engine — Type Definitions
 * 
 * Covers strategy configuration, rule evaluation, trade management,
 * and performance metrics for both backtesting and forward testing.
 */

import { KLineData } from 'klinecharts'
import { Period } from '../types'

// ──────────────────────────────────────────────
// Condition & Rule System
// ──────────────────────────────────────────────

export type ConditionOperator =
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'equals'
  | 'not_equals'
  | 'crosses_above'
  | 'crosses_below'
  | 'is_true'        // for boolean-like fields (divergence, absorption)
  | 'is_false'

export interface CompareTarget {
  type: 'value' | 'indicator' | 'price_field'
  /** Static numeric value (when type='value') */
  value?: number
  /** String value for enum comparisons like 'bull'/'bear' */
  stringValue?: string
  /** Indicator name (when type='indicator') */
  source?: string
  /** Field name on the indicator result or price bar (when type='indicator' | 'price_field') */
  field?: string
}

export interface Condition {
  id: string
  /** Source: 'price' for OHLCV fields, or indicator name like 'CVD', 'ABSORPTION' */
  source: string
  /** Field on the source: 'close', 'open', 'cvdClose', 'divergence', 'absorption', etc. */
  field: string
  /** Comparison operator */
  operator: ConditionOperator
  /** What to compare against */
  compareWith: CompareTarget
}

export interface RuleGroup {
  logic: 'AND' | 'OR'
  conditions: Condition[]
}

// ──────────────────────────────────────────────
// Stop Loss / Take Profit / Trailing
// ──────────────────────────────────────────────

export type StopLossType = 'fixed_pips' | 'atr_multiple' | 'percent' | 'none'
export type TakeProfitType = 'fixed_pips' | 'rr_ratio' | 'atr_multiple' | 'percent' | 'none'

export interface StopLossConfig {
  type: StopLossType
  value: number
}

export interface TakeProfitConfig {
  type: TakeProfitType
  value: number
}

export interface TrailingStopConfig {
  enabled: boolean
  /** Pips from entry before trailing activates */
  activationPips: number
  /** Trail distance in pips */
  trailPips: number
}

// ──────────────────────────────────────────────
// Cost Simulation
// ──────────────────────────────────────────────

export interface CostConfig {
  includeSpread: boolean
  /** Spread in pips (e.g. 1.5) */
  spreadPips: number
  includeCommission: boolean
  /** Commission per lot in account currency (e.g. 7.0 USD) */
  commissionPerLot: number
  /** Pip value per lot in account currency (e.g. 10 USD for standard forex lot) */
  pipValue: number
}

// ──────────────────────────────────────────────
// Strategy Configuration
// ──────────────────────────────────────────────

export interface StrategyConfig {
  id: string
  name: string
  description?: string
  mode: 'visual' | 'script'

  // Capital & Risk
  initialCapital: number
  currency: string
  lotSize: number
  maxOpenTrades: number

  // Cost Simulation
  costs: CostConfig

  // Visual Mode Rules
  longEntry?: RuleGroup
  shortEntry?: RuleGroup
  longExit?: RuleGroup
  shortExit?: RuleGroup

  // Risk Management
  stopLoss: StopLossConfig
  takeProfit: TakeProfitConfig
  trailingStop?: TrailingStopConfig

  // Script Mode (Phase 4)
  scriptCode?: string

  // Multi-Timeframe (Phase 4)
  confirmationTimeframe?: Period

  // Execution Settings
  backtestRange?: {
    from: number
    to: number
  }
}

// ──────────────────────────────────────────────
// Trade & Position
// ──────────────────────────────────────────────

export type TradeDirection = 'long' | 'short'
export type TradeStatus = 'open' | 'closed'
export type ExitReason = 'signal' | 'stop_loss' | 'take_profit' | 'trailing_stop' | 'manual' | 'end_of_data'

export interface Trade {
  id: string
  direction: TradeDirection
  status: TradeStatus

  // Entry
  entryBar: number
  entryPrice: number
  entryTime: number

  // Exit (populated when closed)
  exitBar?: number
  exitPrice?: number
  exitTime?: number
  exitReason?: ExitReason

  // Position
  lotSize: number

  // P&L (populated when closed)
  pnl?: number
  pnlPercent?: number
  pnlPips?: number

  // Costs
  costs: {
    spread: number
    commission: number
    total: number
  }

  // Risk Management State
  stopLossPrice?: number
  takeProfitPrice?: number
  trailingStopPrice?: number
  trailingActivated?: boolean

  // High water mark for trailing stop
  maxFavorablePrice?: number
}

// ──────────────────────────────────────────────
// Equity Curve
// ──────────────────────────────────────────────

export interface EquityPoint {
  barIndex: number
  timestamp: number
  equity: number
  drawdown: number
  drawdownPercent: number
}

// ──────────────────────────────────────────────
// Performance Metrics
// ──────────────────────────────────────────────

export interface PerformanceMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number              // 0-1

  netProfit: number
  netProfitPercent: number
  grossProfit: number
  grossLoss: number
  profitFactor: number         // grossProfit / grossLoss

  maxDrawdown: number
  maxDrawdownPercent: number

  avgWin: number
  avgLoss: number
  avgRR: number                // avgWin / avgLoss
  largestWin: number
  largestLoss: number

  sharpeRatio: number
  expectancy: number           // (winRate * avgWin) - ((1 - winRate) * avgLoss)

  maxConsecutiveWins: number
  maxConsecutiveLosses: number

  avgTradeDurationBars: number
  avgTradeDurationMs: number

  totalCosts: number
  totalSpreadCost: number
  totalCommissionCost: number
}

// ──────────────────────────────────────────────
// Backtest Results
// ──────────────────────────────────────────────

export interface BacktestResults {
  strategyName: string
  symbol: string
  period: string
  dateRange: { from: number; to: number }
  config: StrategyConfig

  trades: Trade[]
  metrics: PerformanceMetrics
  equityCurve: EquityPoint[]

  executionTime: number   // ms
}

// ──────────────────────────────────────────────
// Strategy Events (emitted during processing)
// ──────────────────────────────────────────────

export type StrategyEventType =
  | 'entry_long'
  | 'entry_short'
  | 'exit_long'
  | 'exit_short'
  | 'stop_loss'
  | 'take_profit'
  | 'trailing_stop'

export interface StrategyEvent {
  type: StrategyEventType
  barIndex: number
  price: number
  timestamp: number
  trade: Trade
}

// ──────────────────────────────────────────────
// Indicator Field Metadata (for UI dropdowns)
// ──────────────────────────────────────────────

export interface IndicatorFieldInfo {
  /** Indicator name as registered in klinecharts (e.g. 'CVD', 'ABSORPTION', 'MA') */
  indicatorName: string
  /** Display label */
  label: string
  /** Available fields from this indicator's result */
  fields: {
    key: string
    label: string
    type: 'number' | 'string' | 'boolean'
  }[]
}

/** Price bar fields available for conditions */
export const PRICE_FIELDS = [
  { key: 'open', label: 'Open', type: 'number' as const },
  { key: 'high', label: 'High', type: 'number' as const },
  { key: 'low', label: 'Low', type: 'number' as const },
  { key: 'close', label: 'Close', type: 'number' as const },
  { key: 'volume', label: 'Volume', type: 'number' as const },
]

/** Built-in indicator field definitions for the rule builder UI */
export const BUILTIN_INDICATOR_FIELDS: IndicatorFieldInfo[] = [
  {
    indicatorName: 'CVD',
    label: 'CVD',
    fields: [
      { key: 'cvdClose', label: 'CVD Close', type: 'number' },
      { key: 'cvdOpen', label: 'CVD Open', type: 'number' },
      { key: 'cvdHigh', label: 'CVD High', type: 'number' },
      { key: 'cvdLow', label: 'CVD Low', type: 'number' },
      { key: 'delta', label: 'Delta', type: 'number' },
      { key: 'ma', label: 'MA', type: 'number' },
      { key: 'divergence', label: 'Divergence', type: 'string' },  // 'bull' | 'bear' | undefined
    ]
  },
  {
    indicatorName: 'ABSORPTION',
    label: 'Absorption',
    fields: [
      { key: 'absorption', label: 'Signal', type: 'string' },  // 'bull' | 'bear' | undefined
      { key: 'strength', label: 'Strength', type: 'number' },
      { key: 'delta', label: 'Delta', type: 'number' },
      { key: 'volumeMA', label: 'Volume MA', type: 'number' },
      { key: 'atr', label: 'ATR', type: 'number' },
    ]
  },
  {
    indicatorName: 'MA',
    label: 'MA',
    fields: [
      { key: 'ma1', label: 'MA1', type: 'number' },
      { key: 'ma2', label: 'MA2', type: 'number' },
      { key: 'ma3', label: 'MA3', type: 'number' },
    ]
  },
  {
    indicatorName: 'VOL',
    label: 'Volume',
    fields: [
      { key: 'volume', label: 'Volume', type: 'number' },
      { key: 'ma1', label: 'Volume MA', type: 'number' },
    ]
  },
  {
    indicatorName: 'RSI',
    label: 'RSI',
    fields: [
      { key: 'rsi', label: 'RSI', type: 'number' },
    ]
  },
  {
    indicatorName: 'MACD',
    label: 'MACD',
    fields: [
      { key: 'dif', label: 'DIF', type: 'number' },
      { key: 'dea', label: 'DEA', type: 'number' },
      { key: 'macd', label: 'MACD', type: 'number' },
    ]
  },
  {
    indicatorName: 'BOLL',
    label: 'Bollinger Bands',
    fields: [
      { key: 'mid', label: 'Middle', type: 'number' },
      { key: 'upper', label: 'Upper', type: 'number' },
      { key: 'lower', label: 'Lower', type: 'number' },
    ]
  },
]
