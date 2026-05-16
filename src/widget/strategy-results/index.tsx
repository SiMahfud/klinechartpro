/**
 * Strategy Results Panel — Displays backtest/forward test results.
 * 
 * Slide-in panel showing metrics, equity curve, and trade log.
 */

import { Component, Show, For, onMount, createEffect } from 'solid-js'
import type { BacktestResults, Trade } from '../../strategy/types'
import i18n from '../../i18n'

export interface StrategyResultsProps {
  locale: string
  visible: boolean
  results: BacktestResults | null
  onClose: () => void
  onTradeClick: (trade: Trade) => void
  onModify: () => void
  onExportCSV: () => void
}

function formatPnL (value: number): string {
  const prefix = value >= 0 ? '+' : ''
  if (Math.abs(value) >= 1e6) return `${prefix}${(value / 1e6).toFixed(2)}M`
  if (Math.abs(value) >= 1e3) return `${prefix}${(value / 1e3).toFixed(2)}K`
  return `${prefix}${value.toFixed(2)}`
}

function formatPercent (value: number): string {
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}%`
}

function formatDuration (ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`
  return `${(ms / 86400000).toFixed(1)}d`
}

function formatDate (timestamp: number): string {
  const d = new Date(timestamp)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${mins}`
}

const StrategyResults: Component<StrategyResultsProps> = props => {
  let equityCanvasRef: HTMLCanvasElement | undefined

  // Draw equity curve on canvas
  const drawEquityCurve = () => {
    const canvas = equityCanvasRef
    const results = props.results
    if (!canvas || !results || results.equityCurve.length < 2) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const curve = results.equityCurve
    const padding = { top: 8, bottom: 8, left: 0, right: 0 }

    const equities = curve.map(p => p.equity)
    const minEquity = Math.min(...equities)
    const maxEquity = Math.max(...equities)
    const range = maxEquity - minEquity || 1

    const plotW = w - padding.left - padding.right
    const plotH = h - padding.top - padding.bottom

    // Clear
    ctx.clearRect(0, 0, w, h)

    // Baseline (initial capital)
    const initialY = padding.top + plotH - ((results.config.initialCapital - minEquity) / range) * plotH
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(0, initialY)
    ctx.lineTo(w, initialY)
    ctx.stroke()
    ctx.setLineDash([])

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h)
    gradient.addColorStop(0, 'rgba(33, 150, 243, 0.15)')
    gradient.addColorStop(1, 'rgba(33, 150, 243, 0.01)')

    // Equity line
    ctx.beginPath()
    for (let i = 0; i < curve.length; i++) {
      const x = padding.left + (i / (curve.length - 1)) * plotW
      const y = padding.top + plotH - ((curve[i].equity - minEquity) / range) * plotH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    // Fill
    const lastX = padding.left + plotW
    const lastY = padding.top + plotH
    ctx.lineTo(lastX, lastY)
    ctx.lineTo(padding.left, lastY)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    // Stroke line
    ctx.beginPath()
    for (let i = 0; i < curve.length; i++) {
      const x = padding.left + (i / (curve.length - 1)) * plotW
      const y = padding.top + plotH - ((curve[i].equity - minEquity) / range) * plotH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = '#2196F3'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  createEffect(() => {
    if (props.visible && props.results) {
      setTimeout(drawEquityCurve, 50)
    }
  })

  return (
    <Show when={props.visible && props.results}>
      <div class="klinecharts-pro-strategy-results">
        {/* Header */}
        <div class="results-header">
          <div class="results-title">
            📈 {props.results!.strategyName}
          </div>
          <span class="results-close" onClick={() => props.onClose()}>✕</span>
        </div>

        {/* Meta */}
        <div class="results-meta">
          {props.results!.symbol} · {props.results!.period} ·
          {` ${new Date(props.results!.dateRange.from).toLocaleDateString()} → ${new Date(props.results!.dateRange.to).toLocaleDateString()}`}
          {` · ${props.results!.executionTime.toFixed(0)}ms`}
        </div>

        {/* Content */}
        <div class="results-content">
          {/* Metric Cards */}
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">{i18n('net_profit', props.locale) || 'Net Profit'}</div>
              <div class={`metric-value ${props.results!.metrics.netProfit >= 0 ? 'positive' : 'negative'}`}>
                {formatPnL(props.results!.metrics.netProfit)}
              </div>
              <div class="metric-sub">{formatPercent(props.results!.metrics.netProfitPercent)}</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">{i18n('win_rate', props.locale) || 'Win Rate'}</div>
              <div class={`metric-value ${props.results!.metrics.winRate >= 0.5 ? 'positive' : 'negative'}`}>
                {(props.results!.metrics.winRate * 100).toFixed(1)}%
              </div>
              <div class="metric-sub">
                {props.results!.metrics.winningTrades}W / {props.results!.metrics.losingTrades}L
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">{i18n('profit_factor', props.locale) || 'Profit Factor'}</div>
              <div class={`metric-value ${props.results!.metrics.profitFactor >= 1 ? 'positive' : 'negative'}`}>
                {props.results!.metrics.profitFactor === Infinity ? '∞' : props.results!.metrics.profitFactor.toFixed(2)}
              </div>
              <div class="metric-sub">
                Avg R:R {props.results!.metrics.avgRR === Infinity ? '∞' : props.results!.metrics.avgRR.toFixed(2)}
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-label">{i18n('max_drawdown', props.locale) || 'Max Drawdown'}</div>
              <div class="metric-value negative">
                -{formatPnL(props.results!.metrics.maxDrawdown)}
              </div>
              <div class="metric-sub">{formatPercent(-props.results!.metrics.maxDrawdownPercent)}</div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Expectancy</div>
              <div class={`metric-value ${props.results!.metrics.expectancy >= 0 ? 'positive' : 'negative'}`}>
                {formatPnL(props.results!.metrics.expectancy)}
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Sharpe Ratio</div>
              <div class="metric-value neutral">
                {props.results!.metrics.sharpeRatio.toFixed(2)}
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Avg Duration</div>
              <div class="metric-value neutral">
                {formatDuration(props.results!.metrics.avgTradeDurationMs)}
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Total Costs</div>
              <div class="metric-value neutral">
                {formatPnL(props.results!.metrics.totalCosts)}
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          <div class="equity-curve-section">
            <div class="trade-table-title">{i18n('equity_curve', props.locale) || 'Equity Curve'}</div>
            <canvas ref={equityCanvasRef} class="equity-curve-canvas" />
          </div>

          {/* Trade Table */}
          <div class="trade-table-section">
            <div class="trade-table-title">
              {i18n('trade_log', props.locale) || 'Trade Log'} ({props.results!.trades.length})
            </div>
            <table class="trade-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>P&L</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.results!.trades}>
                  {(trade, index) => (
                    <tr onClick={() => props.onTradeClick(trade)}>
                      <td>{index() + 1}</td>
                      <td>
                        <span class={`trade-dir ${trade.direction}`}>
                          {trade.direction === 'long' ? '▲ Long' : '▼ Short'}
                        </span>
                      </td>
                      <td>{trade.entryPrice.toFixed(2)}</td>
                      <td>{trade.exitPrice?.toFixed(2) ?? '—'}</td>
                      <td>
                        <span class={`trade-pnl ${(trade.pnl ?? 0) >= 0 ? 'win' : 'loss'}`}>
                          {formatPnL(trade.pnl ?? 0)}
                        </span>
                      </td>
                      <td style={{ 'font-size': '10px', color: '#546E7A' }}>
                        {trade.exitReason ?? '—'}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div class="results-footer">
          <button onClick={props.onExportCSV}>
            {i18n('export_csv', props.locale) || 'Export CSV'}
          </button>
          <button class="primary" onClick={props.onModify}>
            Modify & Re-run
          </button>
        </div>
      </div>
    </Show>
  )
}

export default StrategyResults
