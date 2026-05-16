/**
 * Forward Test Live Panel — Floating mini-panel showing real-time strategy state.
 */

import { Component, Show, For } from 'solid-js'
import type { Trade } from '../../strategy/types'
import i18n from '../../i18n'

export interface StrategyLivePanelProps {
  locale: string
  visible: boolean
  strategyName: string
  equity: number
  initialCapital: number
  openPositions: Trade[]
  closedTradeCount: number
  winCount: number
  lossCount: number
  onStop: () => void
  onViewResults: () => void
}

function formatPnL (value: number): string {
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}`
}

const StrategyLivePanel: Component<StrategyLivePanelProps> = props => {
  const unrealizedPnL = () => {
    // This is a simplified display — actual unrealized P&L is tracked by the engine
    return props.equity - props.initialCapital
  }

  const pnlPercent = () => {
    if (props.initialCapital === 0) return 0
    return ((props.equity - props.initialCapital) / props.initialCapital) * 100
  }

  return (
    <Show when={props.visible}>
      <div class="klinecharts-pro-live-panel">
        <div class="live-panel-header">
          <div class="live-panel-status">
            <span class="live-dot" />
            FWD TEST — Running
          </div>
        </div>

        <div class="live-panel-content">
          <div class="live-panel-row">
            <span class="live-panel-label">Strategy</span>
            <span>{props.strategyName}</span>
          </div>

          <Show when={props.openPositions.length > 0}>
            <For each={props.openPositions}>
              {(pos) => (
                <div class="live-panel-row">
                  <span class="live-panel-label">Open</span>
                  <span style={{ color: pos.direction === 'long' ? '#00C076' : '#EF5350' }}>
                    {pos.direction === 'long' ? '▲' : '▼'} {pos.direction} @ {pos.entryPrice.toFixed(2)}
                  </span>
                </div>
              )}
            </For>
          </Show>

          <div class="live-panel-row">
            <span class="live-panel-label">Equity</span>
            <span style={{ color: unrealizedPnL() >= 0 ? '#00C076' : '#EF5350' }}>
              {formatPnL(unrealizedPnL())} ({pnlPercent().toFixed(2)}%)
            </span>
          </div>

          <div class="live-panel-row">
            <span class="live-panel-label">Trades</span>
            <span>
              {props.closedTradeCount} (W: {props.winCount}, L: {props.lossCount})
            </span>
          </div>
        </div>

        <div class="live-panel-footer">
          <button class="stop" onClick={props.onStop}>
            {i18n('stop_test', props.locale) || 'Stop Test'}
          </button>
          <button onClick={props.onViewResults}>
            View Results
          </button>
        </div>
      </div>
    </Show>
  )
}

export default StrategyLivePanel
