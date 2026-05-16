/**
 * RuleRow — Single condition row in the rule builder.
 */

import { Component, Show, For } from 'solid-js'
import type { Condition, ConditionOperator, CompareTarget, IndicatorFieldInfo } from '../../strategy/types'
import { PRICE_FIELDS } from '../../strategy/types'

export interface RuleRowProps {
  condition: Condition
  indicators: IndicatorFieldInfo[]
  onUpdate: (updates: Partial<Condition>) => void
  onRemove: () => void
}

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'greater_equal', label: '≥' },
  { value: 'less_equal', label: '≤' },
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'crosses_above', label: 'Crosses ↑' },
  { value: 'crosses_below', label: 'Crosses ↓' },
  { value: 'is_true', label: 'Is Active' },
  { value: 'is_false', label: 'Not Active' },
]

const RuleRow: Component<RuleRowProps> = props => {
  // All available sources: Price + indicators
  const allSources = () => {
    const sources: { value: string; label: string }[] = [
      { value: 'price', label: 'Price' }
    ]
    props.indicators.forEach(ind => {
      sources.push({ value: ind.indicatorName, label: ind.label })
    })
    return sources
  }

  // Fields for the selected source
  const fieldsForSource = () => {
    if (props.condition.source === 'price') {
      return PRICE_FIELDS
    }
    const ind = props.indicators.find(i => i.indicatorName === props.condition.source)
    return ind?.fields ?? []
  }

  // Current field type
  const currentFieldType = () => {
    const fields = fieldsForSource()
    const field = fields.find(f => f.key === props.condition.field)
    return field?.type ?? 'number'
  }

  // Whether the operator needs a comparison value
  const needsCompareValue = () => {
    return !['is_true', 'is_false'].includes(props.condition.operator)
  }

  // Whether the field is a string enum (divergence, absorption)
  const isStringField = () => currentFieldType() === 'string'

  const handleSourceChange = (source: string) => {
    const firstField = source === 'price'
      ? PRICE_FIELDS[0]?.key ?? 'close'
      : (props.indicators.find(i => i.indicatorName === source)?.fields[0]?.key ?? '')
    props.onUpdate({ source, field: firstField })
  }

  return (
    <div class="rule-row">
      {/* Source selector */}
      <select
        class="rule-select source"
        value={props.condition.source}
        onChange={(e) => handleSourceChange((e.target as HTMLSelectElement).value)}>
        <For each={allSources()}>
          {(src) => <option value={src.value}>{src.label}</option>}
        </For>
      </select>

      {/* Field selector */}
      <select
        class="rule-select field"
        value={props.condition.field}
        onChange={(e) => props.onUpdate({ field: (e.target as HTMLSelectElement).value })}>
        <For each={fieldsForSource()}>
          {(field) => <option value={field.key}>{field.label}</option>}
        </For>
      </select>

      {/* Operator selector */}
      <select
        class="rule-select operator"
        value={props.condition.operator}
        onChange={(e) => props.onUpdate({ operator: (e.target as HTMLSelectElement).value as ConditionOperator })}>
        <For each={OPERATORS}>
          {(op) => <option value={op.value}>{op.label}</option>}
        </For>
      </select>

      {/* Comparison value */}
      <Show when={needsCompareValue()}>
        <Show when={isStringField()}>
          {/* String enum value (bull/bear) */}
          <select
            class="rule-select value"
            value={props.condition.compareWith.stringValue ?? ''}
            onChange={(e) => props.onUpdate({
              compareWith: {
                type: 'value',
                stringValue: (e.target as HTMLSelectElement).value
              }
            })}>
            <option value="bull">Bull</option>
            <option value="bear">Bear</option>
          </select>
        </Show>
        <Show when={!isStringField()}>
          {/* Numeric value or indicator/price field comparison */}
          <div class="compare-group">
            <select
              class="rule-select compare-type"
              value={props.condition.compareWith.type}
              onChange={(e) => {
                const type = (e.target as HTMLSelectElement).value as CompareTarget['type']
                props.onUpdate({
                  compareWith: {
                    type,
                    value: props.condition.compareWith.value ?? 0,
                    source: type === 'indicator' ? (props.indicators[0]?.indicatorName ?? '') : undefined,
                    field: type === 'price_field' ? 'close' : undefined
                  }
                })
              }}>
              <option value="value">Value</option>
              <option value="price_field">Price</option>
              <option value="indicator">Indicator</option>
            </select>

            <Show when={props.condition.compareWith.type === 'value'}>
              <input
                type="number"
                class="rule-input value"
                value={props.condition.compareWith.value ?? 0}
                step="any"
                onInput={(e) => props.onUpdate({
                  compareWith: {
                    ...props.condition.compareWith,
                    value: parseFloat((e.target as HTMLInputElement).value) || 0
                  }
                })}
              />
            </Show>

            <Show when={props.condition.compareWith.type === 'price_field'}>
              <select
                class="rule-select"
                value={props.condition.compareWith.field ?? 'close'}
                onChange={(e) => props.onUpdate({
                  compareWith: {
                    ...props.condition.compareWith,
                    field: (e.target as HTMLSelectElement).value
                  }
                })}>
                <For each={PRICE_FIELDS}>
                  {(f) => <option value={f.key}>{f.label}</option>}
                </For>
              </select>
            </Show>

            <Show when={props.condition.compareWith.type === 'indicator'}>
              <select
                class="rule-select"
                value={props.condition.compareWith.source ?? ''}
                onChange={(e) => {
                  const src = (e.target as HTMLSelectElement).value
                  const ind = props.indicators.find(i => i.indicatorName === src)
                  props.onUpdate({
                    compareWith: {
                      ...props.condition.compareWith,
                      source: src,
                      field: ind?.fields[0]?.key ?? ''
                    }
                  })
                }}>
                <For each={props.indicators}>
                  {(ind) => <option value={ind.indicatorName}>{ind.label}</option>}
                </For>
              </select>
              <select
                class="rule-select"
                value={props.condition.compareWith.field ?? ''}
                onChange={(e) => props.onUpdate({
                  compareWith: {
                    ...props.condition.compareWith,
                    field: (e.target as HTMLSelectElement).value
                  }
                })}>
                <For each={props.indicators.find(i => i.indicatorName === props.condition.compareWith.source)?.fields ?? []}>
                  {(f) => <option value={f.key}>{f.label}</option>}
                </For>
              </select>
            </Show>
          </div>
        </Show>
      </Show>

      {/* Remove button */}
      <button class="rule-remove-btn" onClick={() => props.onRemove()}>✕</button>
    </div>
  )
}

export default RuleRow
