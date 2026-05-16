/**
 * Rule Evaluator — Condition evaluation for strategy signals.
 * 
 * Evaluates visual rule conditions against current bar data
 * and indicator results to determine entry/exit signals.
 */

import { KLineData } from 'klinecharts'
import type { RuleGroup, Condition, ConditionOperator, CompareTarget } from './types'

// ──────────────────────────────────────────────
// Main Evaluation Functions
// ──────────────────────────────────────────────

/**
 * Evaluate an entire rule group (AND/OR logic).
 * Returns true if the rule group conditions are satisfied.
 */
export function evaluateRuleGroup (
  group: RuleGroup | undefined,
  bar: KLineData,
  prevBar: KLineData | null,
  indicators: Map<string, any>,
  prevIndicators: Map<string, any>
): boolean {
  if (!group || group.conditions.length === 0) return false

  if (group.logic === 'AND') {
    return group.conditions.every(c =>
      evaluateCondition(c, bar, prevBar, indicators, prevIndicators)
    )
  } else {
    return group.conditions.some(c =>
      evaluateCondition(c, bar, prevBar, indicators, prevIndicators)
    )
  }
}

/**
 * Evaluate a single condition.
 */
export function evaluateCondition (
  condition: Condition,
  bar: KLineData,
  prevBar: KLineData | null,
  indicators: Map<string, any>,
  prevIndicators: Map<string, any>
): boolean {
  // Get current value
  const currentValue = getFieldValue(condition.source, condition.field, bar, indicators)
  
  // Get previous value (needed for crosses_above/crosses_below)
  const prevValue = prevBar
    ? getFieldValue(condition.source, condition.field, prevBar, prevIndicators)
    : undefined

  // Get comparison target value
  const targetValue = getCompareValue(condition.compareWith, bar, indicators)

  // Evaluate based on operator
  return evaluateOperator(
    condition.operator,
    currentValue,
    prevValue,
    targetValue,
    condition.compareWith.stringValue
  )
}

// ──────────────────────────────────────────────
// Value Resolution
// ──────────────────────────────────────────────

/**
 * Get a field value from either price bar data or indicator result.
 */
function getFieldValue (
  source: string,
  field: string,
  bar: KLineData,
  indicators: Map<string, any>
): any {
  if (source === 'price') {
    return (bar as any)[field]
  }

  // Indicator source
  const indicatorResult = indicators.get(source)
  if (indicatorResult === undefined || indicatorResult === null) return undefined
  return indicatorResult[field]
}

/**
 * Get the comparison target value.
 */
function getCompareValue (
  target: CompareTarget,
  bar: KLineData,
  indicators: Map<string, any>
): any {
  switch (target.type) {
    case 'value':
      // Return stringValue if present (for enum comparisons like 'bull'/'bear')
      return target.stringValue ?? target.value
    case 'price_field':
      return target.field ? (bar as any)[target.field] : undefined
    case 'indicator':
      if (target.source && target.field) {
        const result = indicators.get(target.source)
        return result?.[target.field]
      }
      return undefined
    default:
      return target.value
  }
}

// ──────────────────────────────────────────────
// Operator Evaluation
// ──────────────────────────────────────────────

/**
 * Evaluate a comparison operator.
 */
function evaluateOperator (
  operator: ConditionOperator,
  currentValue: any,
  prevValue: any,
  targetValue: any,
  stringTarget?: string
): boolean {
  // Handle undefined values
  if (currentValue === undefined || currentValue === null) {
    if (operator === 'is_false') return true
    return false
  }

  switch (operator) {
    case 'greater_than':
      return toNumber(currentValue) > toNumber(targetValue)

    case 'less_than':
      return toNumber(currentValue) < toNumber(targetValue)

    case 'greater_equal':
      return toNumber(currentValue) >= toNumber(targetValue)

    case 'less_equal':
      return toNumber(currentValue) <= toNumber(targetValue)

    case 'equals':
      // Support both numeric and string comparison
      if (stringTarget !== undefined) {
        return String(currentValue) === stringTarget
      }
      if (typeof currentValue === 'string' || typeof targetValue === 'string') {
        return String(currentValue) === String(targetValue)
      }
      return toNumber(currentValue) === toNumber(targetValue)

    case 'not_equals':
      if (stringTarget !== undefined) {
        return String(currentValue) !== stringTarget
      }
      if (typeof currentValue === 'string' || typeof targetValue === 'string') {
        return String(currentValue) !== String(targetValue)
      }
      return toNumber(currentValue) !== toNumber(targetValue)

    case 'crosses_above':
      if (prevValue === undefined || prevValue === null) return false
      return toNumber(prevValue) < toNumber(targetValue) &&
             toNumber(currentValue) >= toNumber(targetValue)

    case 'crosses_below':
      if (prevValue === undefined || prevValue === null) return false
      return toNumber(prevValue) > toNumber(targetValue) &&
             toNumber(currentValue) <= toNumber(targetValue)

    case 'is_true':
      // For boolean-like fields: truthy check
      // Also handles string enums: 'bull', 'bear' are truthy
      return currentValue !== false &&
             currentValue !== 0 &&
             currentValue !== '' &&
             currentValue !== undefined &&
             currentValue !== null

    case 'is_false':
      return currentValue === false ||
             currentValue === 0 ||
             currentValue === '' ||
             currentValue === undefined ||
             currentValue === null

    default:
      return false
  }
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function toNumber (value: any): number {
  if (typeof value === 'number') return value
  const n = Number(value)
  return isNaN(n) ? 0 : n
}

/**
 * Collect indicator results for a specific bar index from all active indicators.
 * Used by the strategy engine to build the indicators map for each bar.
 */
export function collectIndicatorResults (
  indicatorData: Map<string, any[]>,
  barIndex: number
): Map<string, any> {
  const result = new Map<string, any>()
  indicatorData.forEach((dataArray, name) => {
    if (barIndex >= 0 && barIndex < dataArray.length) {
      result.set(name, dataArray[barIndex])
    }
  })
  return result
}
