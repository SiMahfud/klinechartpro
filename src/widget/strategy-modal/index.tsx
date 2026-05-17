/**
 * Strategy Builder Modal — Visual strategy configuration.
 * 
 * Allows users to define entry/exit rules, risk management,
 * cost settings, and run backtests or start forward tests.
 */

import { Component, createSignal, Show, For, createEffect, onMount } from 'solid-js'
import { isStrategyScript } from '../../../pine-to-kline/src'
import type {
  StrategyConfig, RuleGroup, Condition, ConditionOperator,
  CompareTarget, StopLossType, TakeProfitType,
  IndicatorFieldInfo
} from '../../strategy/types'
import { PRICE_FIELDS, BUILTIN_INDICATOR_FIELDS } from '../../strategy/types'
import { STRATEGY_PRESETS } from '../../strategy/presets'
import i18n from '../../i18n'
import RuleRow from './RuleRow'

export interface StrategyModalProps {
  locale: string
  visible: boolean
  savedStrategies: StrategyConfig[]
  activeIndicators: string[]
  onClose: () => void
  onRunBacktest: (config: StrategyConfig) => void
  onStartForwardTest: (config: StrategyConfig) => void
  onStartReplay: (config: StrategyConfig) => void
  onSaveStrategy: (config: StrategyConfig) => void
  onDeleteStrategy: (id: string) => void
}

function generateId (): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

function createEmptyCondition (): Condition {
  return {
    id: generateId(),
    source: 'price',
    field: 'close',
    operator: 'greater_than',
    compareWith: { type: 'value', value: 0 }
  }
}

function createDefaultConfig (): StrategyConfig {
  return {
    id: generateId(),
    name: 'New Strategy',
    description: '',
    mode: 'visual',
    initialCapital: 10000,
    currency: 'USD',
    lotSize: 0.1,
    maxOpenTrades: 1,
    costs: {
      includeSpread: false,
      spreadPips: 1.5,
      includeCommission: false,
      commissionPerLot: 7,
      pipValue: 10
    },
    longEntry: { logic: 'AND', conditions: [createEmptyCondition()] },
    shortEntry: { logic: 'AND', conditions: [] },
    longExit: { logic: 'AND', conditions: [] },
    shortExit: { logic: 'AND', conditions: [] },
    stopLoss: { type: 'atr_multiple', value: 1.5 },
    takeProfit: { type: 'rr_ratio', value: 2.0 },
    trailingStop: { enabled: false, activationPips: 20, trailPips: 10 }
  }
}

const DEFAULT_PINE_SCRIPT = `//@version=5
strategy("My Strategy", overlay=true)

// Define indicators
fast = ta.sma(close, 10)
slow = ta.sma(close, 20)

// Entry conditions
if ta.crossover(fast, slow)
    strategy.entry("Long", strategy.long)

// Exit conditions
if ta.crossunder(fast, slow)
    strategy.close("Long")

// Plot indicators
plot(fast, "Fast SMA", color=color.blue)
plot(slow, "Slow SMA", color=color.red)
`

const RSI_STRATEGY_TEMPLATE = `//@version=5
strategy("RSI Reversal", overlay=true)

length = input.int(14, "RSI Length")
overbought = input.int(70, "Overbought")
oversold = input.int(30, "Oversold")

rsiValue = ta.rsi(close, length)

if ta.crossover(rsiValue, oversold)
    strategy.entry("Long", strategy.long)

if ta.crossunder(rsiValue, overbought)
    strategy.close("Long")
`

const MACD_STRATEGY_TEMPLATE = `//@version=5
strategy("MACD Cross", overlay=false)

fast = input.int(12, "Fast Length")
slow = input.int(26, "Slow Length")
signal = input.int(9, "Signal Length")

[macdLine, signalLine, hist] = ta.macd(close, fast, slow, signal)

if ta.crossover(macdLine, signalLine)
    strategy.entry("Long", strategy.long)

if ta.crossunder(macdLine, signalLine)
    strategy.close("Long")

plot(macdLine, "MACD", color=color.blue)
plot(signalLine, "Signal", color=color.orange)
`

const StrategyModal: Component<StrategyModalProps> = props => {
  const [config, setConfig] = createSignal<StrategyConfig>(createDefaultConfig())
  const [activeTab, setActiveTab] = createSignal<'rules' | 'script' | 'settings' | 'manage'>('rules')
  const [testMode, setTestMode] = createSignal<'backtest' | 'forward' | 'replay'>('backtest')
  const [scriptCode, setScriptCode] = createSignal<string>(DEFAULT_PINE_SCRIPT)
  const [scriptError, setScriptError] = createSignal<string>('')
  const [scriptCompiling, setScriptCompiling] = createSignal(false)
  const [activeRuleSection, setActiveRuleSection] = createSignal<'longEntry' | 'shortEntry' | 'longExit' | 'shortExit'>('longEntry')

  // Get available indicator fields based on active indicators
  const availableIndicators = () => {
    return BUILTIN_INDICATOR_FIELDS.filter(
      ind => props.activeIndicators.includes(ind.indicatorName)
    )
  }

  // ──────────────────────────────────────────
  // Config Update Helpers
  // ──────────────────────────────────────────

  const updateConfig = (partial: Partial<StrategyConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }))
  }

  const updateCosts = (partial: Partial<StrategyConfig['costs']>) => {
    setConfig(prev => ({
      ...prev,
      costs: { ...prev.costs, ...partial }
    }))
  }

  const updateStopLoss = (partial: Partial<StrategyConfig['stopLoss']>) => {
    setConfig(prev => ({
      ...prev,
      stopLoss: { ...prev.stopLoss, ...partial }
    }))
  }

  const updateTakeProfit = (partial: Partial<StrategyConfig['takeProfit']>) => {
    setConfig(prev => ({
      ...prev,
      takeProfit: { ...prev.takeProfit, ...partial }
    }))
  }

  const updateTrailingStop = (partial: Partial<NonNullable<StrategyConfig['trailingStop']>>) => {
    setConfig(prev => ({
      ...prev,
      trailingStop: { ...(prev.trailingStop ?? { enabled: false, activationPips: 20, trailPips: 10 }), ...partial }
    }))
  }

  // ──────────────────────────────────────────
  // Rule Management
  // ──────────────────────────────────────────

  const getCurrentRuleGroup = (): RuleGroup => {
    const section = activeRuleSection()
    return config()[section] ?? { logic: 'AND', conditions: [] }
  }

  const updateCurrentRuleGroup = (group: RuleGroup) => {
    const section = activeRuleSection()
    updateConfig({ [section]: group })
  }

  const addCondition = () => {
    const group = getCurrentRuleGroup()
    updateCurrentRuleGroup({
      ...group,
      conditions: [...group.conditions, createEmptyCondition()]
    })
  }

  const removeCondition = (condId: string) => {
    const group = getCurrentRuleGroup()
    updateCurrentRuleGroup({
      ...group,
      conditions: group.conditions.filter(c => c.id !== condId)
    })
  }

  const updateCondition = (condId: string, updates: Partial<Condition>) => {
    const group = getCurrentRuleGroup()
    updateCurrentRuleGroup({
      ...group,
      conditions: group.conditions.map(c =>
        c.id === condId ? { ...c, ...updates } : c
      )
    })
  }

  const toggleLogic = () => {
    const group = getCurrentRuleGroup()
    updateCurrentRuleGroup({
      ...group,
      logic: group.logic === 'AND' ? 'OR' : 'AND'
    })
  }

  // ──────────────────────────────────────────
  // Strategy Management
  // ──────────────────────────────────────────

  const loadStrategy = (strategy: StrategyConfig) => {
    setConfig({ ...strategy })
    setActiveTab('rules')
  }

  const handleSave = () => {
    props.onSaveStrategy(config())
  }

  const handleRun = () => {
    if (testMode() === 'backtest') {
      props.onRunBacktest(config())
    } else if (testMode() === 'replay') {
      props.onStartReplay(config())
    } else {
      props.onStartForwardTest(config())
    }
    props.onClose()
  }

  // ──────────────────────────────────────────
  // Section labels
  // ──────────────────────────────────────────

  const ruleSections: { key: typeof activeRuleSection extends () => infer T ? T : never; label: string; color: string }[] = [
    { key: 'longEntry', label: 'Long Entry', color: '#00C076' },
    { key: 'shortEntry', label: 'Short Entry', color: '#EF5350' },
    { key: 'longExit', label: 'Long Exit', color: '#78909C' },
    { key: 'shortExit', label: 'Short Exit', color: '#78909C' },
  ]

  return (
    <Show when={props.visible}>
      <div class="klinecharts-pro-modal-mask" onClick={() => props.onClose()} />
      <div class="klinecharts-pro-strategy-modal">
        {/* Header */}
        <div class="strategy-modal-header">
          <div class="strategy-modal-title">
            <svg viewBox="0 0 20 20" width="18" height="18">
              <path d="M3,17 L7,7 L10,12 L13,5 L17,15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>{i18n('strategy_tester', props.locale)}</span>
          </div>
          <span class="strategy-modal-close" onClick={() => props.onClose()}>✕</span>
        </div>

        {/* Tab Bar */}
        <div class="strategy-modal-tabs">
          <span
            class={`strategy-tab ${activeTab() === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}>
            {i18n('rules', props.locale) || 'Rules'}
          </span>
          <span
            class={`strategy-tab ${activeTab() === 'script' ? 'active' : ''}`}
            onClick={() => setActiveTab('script')}>
            Script
          </span>
          <span
            class={`strategy-tab ${activeTab() === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}>
            {i18n('setting', props.locale)}
          </span>
          <span
            class={`strategy-tab ${activeTab() === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}>
            {i18n('manage', props.locale) || 'Manage'}
          </span>
        </div>

        {/* Content */}
        <div class="strategy-modal-content">
          {/* ─── Strategy Name ─── */}
          <div class="strategy-name-row">
            <input
              type="text"
              class="strategy-name-input"
              value={config().name}
              placeholder="Strategy Name"
              onInput={(e) => updateConfig({ name: (e.target as HTMLInputElement).value })}
            />
          </div>

          {/* ─── TAB: Rules ─── */}
          <Show when={activeTab() === 'rules'}>
            {/* Rule Section Tabs */}
            <div class="rule-section-tabs">
              <For each={ruleSections}>
                {(section) => (
                  <span
                    class={`rule-section-tab ${activeRuleSection() === section.key ? 'active' : ''}`}
                    style={{ '--section-color': section.color }}
                    onClick={() => setActiveRuleSection(section.key as any)}>
                    {section.label}
                  </span>
                )}
              </For>
            </div>

            {/* Logic Toggle */}
            <div class="rule-logic-row">
              <span class="rule-logic-label">Logic:</span>
              <button
                class={`rule-logic-btn ${getCurrentRuleGroup().logic === 'AND' ? 'and' : 'or'}`}
                onClick={toggleLogic}>
                {getCurrentRuleGroup().logic}
              </button>
              <span class="rule-logic-hint">
                {getCurrentRuleGroup().logic === 'AND'
                  ? 'All conditions must be true'
                  : 'Any condition can be true'}
              </span>
            </div>

            {/* Condition Rows */}
            <div class="rule-conditions">
              <For each={getCurrentRuleGroup().conditions}>
                {(condition) => (
                  <RuleRow
                    condition={condition}
                    indicators={availableIndicators()}
                    onUpdate={(updates: Partial<Condition>) => updateCondition(condition.id, updates)}
                    onRemove={() => removeCondition(condition.id)}
                  />
                )}
              </For>

              <button class="add-condition-btn" onClick={addCondition}>
                + Add Condition
              </button>
            </div>

            {/* ─── Risk Management ─── */}
            <div class="strategy-section">
              <div class="strategy-section-title">{i18n('risk_management', props.locale) || 'Risk Management'}</div>
              
              {/* Stop Loss */}
              <div class="risk-row">
                <label>{i18n('stop_loss', props.locale) || 'Stop Loss'}:</label>
                <select
                  value={config().stopLoss.type}
                  onChange={(e) => updateStopLoss({ type: (e.target as HTMLSelectElement).value as StopLossType })}>
                  <option value="none">None</option>
                  <option value="fixed_pips">Fixed Pips</option>
                  <option value="atr_multiple">ATR Multiple</option>
                  <option value="percent">Percent</option>
                  <option value="sr_zone_percent">SR Zone %</option>
                </select>
                <Show when={config().stopLoss.type !== 'none'}>
                  <input
                    type="number"
                    class="risk-value-input"
                    value={config().stopLoss.value}
                    step="0.1"
                    onInput={(e) => updateStopLoss({ value: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                  />
                </Show>
              </div>

              {/* Take Profit */}
              <div class="risk-row">
                <label>{i18n('take_profit', props.locale) || 'Take Profit'}:</label>
                <select
                  value={config().takeProfit.type}
                  onChange={(e) => updateTakeProfit({ type: (e.target as HTMLSelectElement).value as TakeProfitType })}>
                  <option value="none">None</option>
                  <option value="fixed_pips">Fixed Pips</option>
                  <option value="rr_ratio">R:R Ratio</option>
                  <option value="atr_multiple">ATR Multiple</option>
                  <option value="percent">Percent</option>
                </select>
                <Show when={config().takeProfit.type !== 'none'}>
                  <input
                    type="number"
                    class="risk-value-input"
                    value={config().takeProfit.value}
                    step="0.1"
                    onInput={(e) => updateTakeProfit({ value: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                  />
                </Show>
              </div>

              {/* Trailing Stop */}
              <div class="risk-row">
                <label>
                  <input
                    type="checkbox"
                    checked={config().trailingStop?.enabled ?? false}
                    onChange={(e) => updateTrailingStop({ enabled: (e.target as HTMLInputElement).checked })}
                  />
                  {i18n('trailing_stop', props.locale) || 'Trailing Stop'}
                </label>
                <Show when={config().trailingStop?.enabled}>
                  <span class="trailing-label">Activation:</span>
                  <input
                    type="number"
                    class="risk-value-input small"
                    value={config().trailingStop?.activationPips ?? 20}
                    onInput={(e) => updateTrailingStop({ activationPips: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                  />
                  <span class="trailing-label">Trail:</span>
                  <input
                    type="number"
                    class="risk-value-input small"
                    value={config().trailingStop?.trailPips ?? 10}
                    onInput={(e) => updateTrailingStop({ trailPips: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                  />
                  <span class="trailing-label">pips</span>
                </Show>
              </div>
            </div>
          </Show>

          {/* ─── TAB: Script ─── */}
          <Show when={activeTab() === 'script'}>
            <div class="strategy-section">
              <div class="strategy-section-title" style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                <span>PineScript Strategy</span>
                <label style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'font-size': '12px', 'font-weight': 'normal' }}>
                  <input
                    type="checkbox"
                    checked={config().mode === 'script'}
                    onChange={(e) => {
                      updateConfig({ 
                        mode: (e.target as HTMLInputElement).checked ? 'script' : 'visual',
                        scriptCode: scriptCode()
                      })
                    }}
                  />
                  Use Script Mode
                </label>
              </div>
              <div class="script-editor-container">
                <textarea
                  class="script-editor"
                  spellcheck={false}
                  value={scriptCode()}
                  onInput={(e) => {
                    const code = (e.target as HTMLTextAreaElement).value
                    setScriptCode(code)
                    setScriptError('')
                    updateConfig({ scriptCode: code })
                  }}
                  placeholder="Paste your PineScript strategy here..."
                />
                <Show when={scriptError()}>
                  <div class="script-error">{scriptError()}</div>
                </Show>
                <Show when={config().mode === 'script'}>
                  <div class="script-status" style={{ 
                    color: '#00C076', 
                    'font-size': '11px', 
                    padding: '4px 8px',
                    background: 'rgba(0,192,118,0.1)',
                    'border-radius': '4px',
                    'margin-top': '6px'
                  }}>
                    ✓ Script mode active — backtest will use this script instead of visual rules
                  </div>
                </Show>
              </div>
            </div>
            <div class="strategy-section">
              <div class="strategy-section-title">Quick Templates</div>
              <div style={{ display: 'flex', gap: '6px', 'flex-wrap': 'wrap' }}>
                <button class="strategy-btn secondary" style={{ 'font-size': '11px', padding: '4px 8px' }}
                  onClick={() => setScriptCode(DEFAULT_PINE_SCRIPT)}>
                  SMA Cross
                </button>
                <button class="strategy-btn secondary" style={{ 'font-size': '11px', padding: '4px 8px' }}
                  onClick={() => setScriptCode(RSI_STRATEGY_TEMPLATE)}>
                  RSI Reversal
                </button>
                <button class="strategy-btn secondary" style={{ 'font-size': '11px', padding: '4px 8px' }}
                  onClick={() => setScriptCode(MACD_STRATEGY_TEMPLATE)}>
                  MACD Cross
                </button>
              </div>
            </div>
          </Show>

          {/* ─── TAB: Settings ─── */}
          <Show when={activeTab() === 'settings'}>
            <div class="strategy-section">
              <div class="strategy-section-title">Capital & Position</div>
              <div class="settings-grid">
                <label>{i18n('initial_capital', props.locale) || 'Initial Capital'}:</label>
                <div class="settings-row">
                  <input
                    type="number"
                    value={config().initialCapital}
                    onInput={(e) => updateConfig({ initialCapital: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                  />
                  <select
                    value={config().currency}
                    onChange={(e) => updateConfig({ currency: (e.target as HTMLSelectElement).value })}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="IDR">IDR</option>
                  </select>
                </div>

                <label>{i18n('lot_size', props.locale) || 'Lot Size'}:</label>
                <input
                  type="number"
                  step="0.01"
                  value={config().lotSize}
                  onInput={(e) => updateConfig({ lotSize: parseFloat((e.target as HTMLInputElement).value) || 0.01 })}
                />

                <label>Max Open Trades:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config().maxOpenTrades}
                  onInput={(e) => updateConfig({ maxOpenTrades: parseInt((e.target as HTMLInputElement).value) || 1 })}
                />

                <label>Pip Value (per lot):</label>
                <input
                  type="number"
                  step="0.01"
                  value={config().costs.pipValue}
                  onInput={(e) => updateCosts({ pipValue: parseFloat((e.target as HTMLInputElement).value) || 1 })}
                />
              </div>
            </div>

            <div class="strategy-section">
              <div class="strategy-section-title">Backtest Range</div>
              <div class="settings-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={config().backtestRange !== undefined}
                    onChange={(e) => {
                      if ((e.target as HTMLInputElement).checked) {
                        const now = Date.now()
                        // Default to last 30 days
                        updateConfig({ backtestRange: { from: now - 30 * 24 * 60 * 60 * 1000, to: now } })
                      } else {
                        updateConfig({ backtestRange: undefined })
                      }
                    }}
                  />
                  Use Date Range
                </label>
                <Show when={config().backtestRange !== undefined}>
                  <div class="settings-row">
                    <input
                      type="date"
                      value={config().backtestRange?.from ? new Date(config().backtestRange!.from).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const val = (e.target as HTMLInputElement).value
                        if (val) {
                          const date = new Date(val)
                          updateConfig({ backtestRange: { ...(config().backtestRange ?? {from:0, to:0}), from: date.getTime() } })
                        }
                      }}
                    />
                    <span style={{ display: 'flex', 'align-items': 'center', color: '#78909C', padding: '0 4px' }}>to</span>
                    <input
                      type="date"
                      value={config().backtestRange?.to ? new Date(config().backtestRange!.to).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const val = (e.target as HTMLInputElement).value
                        if (val) {
                          const date = new Date(val)
                          // Ensure we cover the end of the day
                          date.setHours(23, 59, 59, 999)
                          updateConfig({ backtestRange: { ...(config().backtestRange ?? {from:0, to:0}), to: date.getTime() } })
                        }
                      }}
                    />
                  </div>
                </Show>
              </div>
            </div>

            <div class="strategy-section">
              <div class="strategy-section-title">Costs</div>
              <div class="settings-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={config().costs.includeSpread}
                    onChange={(e) => updateCosts({ includeSpread: (e.target as HTMLInputElement).checked })}
                  />
                  {i18n('include_spread', props.locale) || 'Include Spread'}
                </label>
                <Show when={config().costs.includeSpread}>
                  <input
                    type="number"
                    step="0.1"
                    value={config().costs.spreadPips}
                    onInput={(e) => updateCosts({ spreadPips: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                  />
                </Show>
                <Show when={!config().costs.includeSpread}><span /></Show>

                <label>
                  <input
                    type="checkbox"
                    checked={config().costs.includeCommission}
                    onChange={(e) => updateCosts({ includeCommission: (e.target as HTMLInputElement).checked })}
                  />
                  {i18n('include_commission', props.locale) || 'Include Commission'}
                </label>
                <Show when={config().costs.includeCommission}>
                  <input
                    type="number"
                    step="0.5"
                    value={config().costs.commissionPerLot}
                    onInput={(e) => updateCosts({ commissionPerLot: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                  />
                </Show>
                <Show when={!config().costs.includeCommission}><span /></Show>
              </div>
            </div>
          </Show>

          {/* ─── TAB: Manage ─── */}
          <Show when={activeTab() === 'manage'}>
            {/* Presets */}
            <div class="strategy-section">
              <div class="strategy-section-title">📋 Strategy Presets</div>
              <div style={{ display: 'flex', gap: '6px', 'flex-wrap': 'wrap', 'margin-bottom': '8px' }}>
                <For each={STRATEGY_PRESETS}>
                  {(preset) => (
                    <button
                      class="strategy-btn secondary"
                      style={{ 'font-size': '11px', padding: '6px 10px', 'text-align': 'left', 'max-width': '100%' }}
                      onClick={() => {
                        const copy = { ...preset, id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}` }
                        loadStrategy(copy)
                      }}
                      title={preset.description}>
                      {preset.name}
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Saved */}
            <div class="strategy-section">
              <div class="strategy-section-title">{i18n('save_strategy', props.locale) || 'Saved Strategies'}</div>
              <Show when={props.savedStrategies.length === 0}>
                <div class="strategy-empty">No saved strategies yet.</div>
              </Show>
              <For each={props.savedStrategies}>
                {(strategy) => (
                  <div class="strategy-list-item">
                    <div class="strategy-list-info">
                      <span class="strategy-list-name">{strategy.name}</span>
                      <span class="strategy-list-desc">{strategy.description || 'No description'}</span>
                    </div>
                    <div class="strategy-list-actions">
                      <button class="strategy-list-btn load" onClick={() => loadStrategy(strategy)}>Load</button>
                      <button class="strategy-list-btn delete" onClick={() => props.onDeleteStrategy(strategy.id)}>✕</button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* ─── Footer: Test Mode & Actions ─── */}
        <div class="strategy-modal-footer">
          <div class="test-mode-selector">
            <label class={`test-mode-option ${testMode() === 'backtest' ? 'active' : ''}`}>
              <input
                type="radio"
                name="testMode"
                value="backtest"
                checked={testMode() === 'backtest'}
                onChange={() => setTestMode('backtest')}
              />
              {i18n('backtest', props.locale) || 'Backtest'}
            </label>
            <label class={`test-mode-option ${testMode() === 'forward' ? 'active' : ''}`}>
              <input
                type="radio"
                name="testMode"
                value="forward"
                checked={testMode() === 'forward'}
                onChange={() => setTestMode('forward')}
              />
              {i18n('forward_test', props.locale) || 'Forward Test'}
            </label>
            <label class={`test-mode-option ${testMode() === 'replay' ? 'active' : ''}`}>
              <input
                type="radio"
                name="testMode"
                value="replay"
                checked={testMode() === 'replay'}
                onChange={() => setTestMode('replay')}
              />
              {i18n('replay', props.locale) || '▶ Replay'}
            </label>
          </div>
          <div class="strategy-action-buttons">
            <button class="strategy-btn secondary" onClick={handleSave}>
              {i18n('save_strategy', props.locale) || 'Save'}
            </button>
            <button class="strategy-btn primary" onClick={handleRun}>
              {testMode() === 'backtest'
                ? `▶ ${i18n('run_backtest', props.locale) || 'Run Backtest'}`
                : testMode() === 'replay'
                  ? `▶ ${i18n('start_replay', props.locale) || 'Start Replay'}`
                  : `▶ ${i18n('start_forward_test', props.locale) || 'Start Forward Test'}`
              }
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default StrategyModal
