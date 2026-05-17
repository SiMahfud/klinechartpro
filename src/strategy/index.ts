/**
 * Strategy Module — Barrel exports.
 */

export { StrategyEngine } from './engine'
export type { StrategyEventCallback } from './engine'
export { TradeSimulator } from './trade-simulator'
export { evaluateRuleGroup, evaluateCondition, collectIndicatorResults } from './rule-evaluator'
export { calculateMetrics } from './metrics'

export type {
  StrategyConfig,
  RuleGroup,
  Condition,
  ConditionOperator,
  CompareTarget,
  CostConfig,
  StopLossConfig,
  StopLossType,
  TakeProfitConfig,
  TakeProfitType,
  TrailingStopConfig,
  Trade,
  TradeDirection,
  TradeStatus,
  ExitReason,
  EquityPoint,
  PerformanceMetrics,
  BacktestResults,
  StrategyEvent,
  StrategyEventType,
  IndicatorFieldInfo,
} from './types'

export {
  PRICE_FIELDS,
  BUILTIN_INDICATOR_FIELDS
} from './types'

export { STRATEGY_PRESETS } from './presets'
