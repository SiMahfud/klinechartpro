/**
 * PRICEACTION — Candle Pattern & Rejection Detector
 *
 * Real-time (0-lag) candle pattern detection for use as
 * confirmation signal with S/R zones, or standalone.
 *
 * Detected patterns:
 *   - Pin Bar (bull/bear) — long wick rejection
 *   - Engulfing (bull/bear) — body swallows previous candle
 *   - Inside Bar — compressed range within previous bar
 *   - Doji — very small body relative to range
 *
 * Additional metrics (per bar):
 *   - wickRatio: upper or lower wick / body size
 *   - bodyPercent: body / total range (0-100)
 *   - volumeSpike: 1 if volume > threshold × MA
 *
 * calcParams:
 *   [0] Volume MA Period    (20)
 *   [1] Volume Spike Mult   (2.0, as integer ×10 → 20)
 *   [2] Pin Bar Wick Ratio  (2.0, as integer ×10 → 20)
 *   [3] Show Pin Bar        (1/0)
 *   [4] Show Engulfing      (1/0)
 *   [5] Show Inside Bar     (1/0)
 *   [6] Show Doji           (1/0)
 *   [7] Show Volume Spike   (1/0)
 */

import { IndicatorTemplate, KLineData, IndicatorSeries } from 'klinecharts'

// ── Pattern Result ──

interface PAResult {
  /** Pattern type for tooltip/strategy */
  pattern: string | undefined
  /** 'bull' | 'bear' | undefined */
  direction: string | undefined
  /** Wick-to-body ratio (the rejection wick) */
  wickRatio: number | undefined
  /** Body as % of total range (0-100) */
  bodyPercent: number | undefined
  /** 1 if volume > threshold, 0 otherwise */
  volumeSpike: number
  /** 'bull' | 'bear' | undefined — direction of volume spike */
  volSpikeDir: string | undefined
  /** Strength score 0-5 */
  strength: number
}

// ── Helpers ──

function isBullish (bar: KLineData): boolean { return bar.close >= bar.open }

function bodySize (bar: KLineData): number { return Math.abs(bar.close - bar.open) }

function totalRange (bar: KLineData): number { return bar.high - bar.low }

function upperWick (bar: KLineData): number {
  return bar.high - Math.max(bar.open, bar.close)
}

function lowerWick (bar: KLineData): number {
  return Math.min(bar.open, bar.close) - bar.low
}

// ── Pattern Detection ──

function detectPattern (
  bar: KLineData,
  prev: KLineData | null,
  pinWickRatio: number
): { pattern: string | undefined, direction: string | undefined, strength: number } {
  const body = bodySize(bar)
  const range = totalRange(bar)
  if (range === 0) return { pattern: undefined, direction: undefined, strength: 0 }

  const bodyPct = (body / range) * 100
  const uWick = upperWick(bar)
  const lWick = lowerWick(bar)
  const bull = isBullish(bar)

  // ─── Doji: body < 10% of range ───
  if (bodyPct < 10) {
    return { pattern: 'doji', direction: undefined, strength: 2 }
  }

  // ─── Pin Bar: one wick ≥ pinWickRatio × body, other wick small ───
  if (body > 0) {
    // Bull pin: long lower wick, small upper wick
    if (lWick >= body * pinWickRatio && uWick < body * 0.5) {
      const str = Math.min(5, Math.floor(lWick / body))
      return { pattern: 'pin_bar', direction: 'bull', strength: str }
    }
    // Bear pin: long upper wick, small lower wick
    if (uWick >= body * pinWickRatio && lWick < body * 0.5) {
      const str = Math.min(5, Math.floor(uWick / body))
      return { pattern: 'pin_bar', direction: 'bear', strength: str }
    }
  }

  // ─── Engulfing: body fully contains previous bar's body ───
  if (prev) {
    const prevBody = bodySize(prev)
    if (body > prevBody * 1.2) {
      const curTop = Math.max(bar.open, bar.close)
      const curBot = Math.min(bar.open, bar.close)
      const prevTop = Math.max(prev.open, prev.close)
      const prevBot = Math.min(prev.open, prev.close)

      if (bull && !isBullish(prev) && curTop > prevTop && curBot < prevBot) {
        return { pattern: 'engulfing', direction: 'bull', strength: 4 }
      }
      if (!bull && isBullish(prev) && curTop > prevTop && curBot < prevBot) {
        return { pattern: 'engulfing', direction: 'bear', strength: 4 }
      }
    }
  }

  // ─── Inside Bar: entire range within previous bar ───
  if (prev && bar.high <= prev.high && bar.low >= prev.low) {
    return { pattern: 'inside_bar', direction: undefined, strength: 2 }
  }

  return { pattern: undefined, direction: undefined, strength: 0 }
}

// ── Colors ──

const COLORS = {
  bull_pin: '#00C853',
  bear_pin: '#FF1744',
  bull_engulf: '#00E676',
  bear_engulf: '#FF5252',
  inside: '#FFD740',
  doji: '#B0BEC5',
  vol_spike: '#E040FB'
}

// ── Module cache — prevents Y-axis scaling issues ──

let _paCache: PAResult[] = []

// ── Indicator ──

const priceaction: IndicatorTemplate = {
  name: 'PRICEACTION',
  shortName: 'Price Action',
  series: IndicatorSeries.Price,
  precision: 4,
  calcParams: [20, 20, 20, 1, 1, 1, 1, 1],
  figures: [{ key: '_pa', title: '', type: 'line', styles: () => ({ color: 'transparent' }) }],

  calc: (dataList: KLineData[], indicator: any) => {
    const p = indicator.calcParams
    const volPeriod = p[0] as number
    const volSpikeMult = (p[1] as number) / 10  // stored as ×10
    const pinWickRatio = (p[2] as number) / 10  // stored as ×10
    const showPin = p[3] as number
    const showEngulf = p[4] as number
    const showInside = p[5] as number
    const showDoji = p[6] as number
    const showVolSpike = p[7] as number

    // Pre-compute volume MA
    const volMA: number[] = new Array(dataList.length).fill(0)
    let volSum = 0
    for (let i = 0; i < dataList.length; i++) {
      volSum += dataList[i].volume ?? 0
      if (i >= volPeriod) volSum -= dataList[i - volPeriod].volume ?? 0
      volMA[i] = i >= volPeriod - 1 ? volSum / volPeriod : volSum / (i + 1)
    }

    // Build results into cache
    _paCache = dataList.map((bar, i): PAResult => {
      const prev = i > 0 ? dataList[i - 1] : null
      const range = totalRange(bar)

      // Pattern detection
      let { pattern, direction, strength } = detectPattern(bar, prev, pinWickRatio)

      // Volume spike with direction
      const vol = bar.volume ?? 0
      const vma = volMA[i] || 1
      const isSpike = showVolSpike && vol > vma * volSpikeMult
      const volumeSpike = isSpike ? 1 : 0
      const volSpikeDir: string | undefined = isSpike ? (isBullish(bar) ? 'bull' : 'bear') : undefined

      // Metrics
      const body = bodySize(bar)
      const wickRatio = body > 0
        ? Math.max(upperWick(bar), lowerWick(bar)) / body
        : 0
      const bodyPercent = range > 0 ? (body / range) * 100 : 0

      // Boost strength if volume spike coincides with pattern
      if (volumeSpike && pattern) strength = Math.min(5, strength + 1)

      return { pattern, direction, wickRatio, bodyPercent, volumeSpike, volSpikeDir, strength }
    })

    // Return all fields — _pa figure key is always undefined so klinecharts
    // won't use numeric fields for Y-axis scaling. Strategy engine reads from ind.result.
    return _paCache.map(r => ({
      _pa: undefined,
      pattern: r.pattern,
      direction: r.direction,
      volSpikeDir: r.volSpikeDir,
      wickRatio: r.wickRatio,
      bodyPercent: r.bodyPercent,
      volumeSpike: r.volumeSpike,
      strength: r.strength
    }))
  },

  draw: ({ ctx, visibleRange, bounding, yAxis, xAxis, indicator }: any) => {
    if (_paCache.length === 0) return false

    const p = indicator.calcParams
    const showPin = p[1] as boolean
    const showEngulf = p[2] as boolean
    const showInside = p[3] as boolean
    const showDoji = p[4] as boolean
    const showVolSpike = p[7] as boolean

    const dataList = (window as any)?._klineChartInstance?.getDataList?.() ?? []
    if (dataList.length === 0) return false

    const barSpace = (window as any)?._klineChartInstance?.getBarSpace?.()
    const halfBar = (barSpace?.bar ?? 6) / 2

    ctx.save()

    for (let i = visibleRange.from; i < visibleRange.to; i++) {
      const r = _paCache[i]
      if (!r) continue

      const bar = dataList[i]
      if (!bar) continue

      const x = xAxis.convertToPixel(i)

      // ── Draw Volume Spike marker ──
      if (r.volumeSpike && showVolSpike) {
        const isBuySpike = r.volSpikeDir === 'bull'
        const y = isBuySpike
          ? yAxis.convertToPixel(bar.low) + 22
          : yAxis.convertToPixel(bar.high) - 22
        const spikeColor = isBuySpike ? '#00E676' : '#FF5252'
        const spikeMarker = isBuySpike ? '▲V' : '▼V'
        ctx.fillStyle = spikeColor
        ctx.font = 'bold 9px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(spikeMarker, x, y)
      }

      // ── Draw Pattern marker ──
      if (r.pattern) {
        // Skip drawing if user toggled this pattern off
        if (r.pattern === 'pin_bar' && !showPin) continue
        if (r.pattern === 'engulfing' && !showEngulf) continue
        if (r.pattern === 'inside_bar' && !showInside) continue
        if (r.pattern === 'doji' && !showDoji) continue

        let color = '#B0BEC5'
        let marker = ''
        let yPos = 0
        const padding = 6

        switch (r.pattern) {
          case 'pin_bar':
            if (r.direction === 'bull') {
              color = COLORS.bull_pin
              marker = '▲'
              yPos = yAxis.convertToPixel(bar.low) + padding + 4
            } else {
              color = COLORS.bear_pin
              marker = '▼'
              yPos = yAxis.convertToPixel(bar.high) - padding - 4
            }
            break
          case 'engulfing':
            if (r.direction === 'bull') {
              color = COLORS.bull_engulf
              marker = '◆'
              yPos = yAxis.convertToPixel(bar.low) + padding + 4
            } else {
              color = COLORS.bear_engulf
              marker = '◆'
              yPos = yAxis.convertToPixel(bar.high) - padding - 4
            }
            break
          case 'inside_bar':
            color = COLORS.inside
            marker = '─'
            yPos = yAxis.convertToPixel(bar.high) - padding - 4
            break
          case 'doji':
            color = COLORS.doji
            marker = '✦'
            yPos = yAxis.convertToPixel(bar.high) - padding - 4
            break
        }

        if (marker) {
          ctx.fillStyle = color
          ctx.font = `bold ${r.strength >= 4 ? 14 : 11}px Inter, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(marker, x, yPos)

          // Strength dots for strong signals
          if (r.strength >= 3) {
            ctx.font = '6px Inter, sans-serif'
            ctx.fillStyle = color
            const dots = '●'.repeat(Math.min(r.strength, 5))
            ctx.fillText(dots, x, yPos + (r.direction === 'bull' || !r.direction ? 10 : -10))
          }
        }
      }
    }

    ctx.restore()
    return true
  },

  createTooltipDataSource: ({ indicator, crosshair, defaultStyles }: any) => {
    const p = indicator.calcParams
    const showPin = p[1] as boolean
    const showEngulf = p[2] as boolean
    const showInside = p[3] as boolean
    const showDoji = p[4] as boolean
    const showVolSpike = p[7] as boolean

    const icons: any[] = []
    const di = defaultStyles?.tooltip?.icons
    if (di) {
      if (indicator.visible) { icons.push(di[1]); icons.push(di[2]); icons.push(di[3]) }
      else { icons.push(di[0]); icons.push(di[2]); icons.push(di[3]) }
    }

    const idx = crosshair?.dataIndex ?? 0
    const r = _paCache[idx]

    if (!r || (!r.pattern && !r.volumeSpike)) {
      return { name: 'Price Action', calcParamsText: '', icons, values: [] }
    }

    const values: any[] = []

    if (r.pattern) {
      // Check if this specific pattern is allowed to be shown in tooltip
      let canShowPattern = false
      if (r.pattern === 'pin_bar' && showPin) canShowPattern = true
      if (r.pattern === 'engulfing' && showEngulf) canShowPattern = true
      if (r.pattern === 'inside_bar' && showInside) canShowPattern = true
      if (r.pattern === 'doji' && showDoji) canShowPattern = true

      if (canShowPattern) {
        const patternLabel = r.pattern.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        const dirLabel = r.direction ? ` (${r.direction === 'bull' ? '↑ Bull' : '↓ Bear'})` : ''
        const colorKey = r.direction
          ? (r.pattern === 'pin_bar'
            ? (r.direction === 'bull' ? COLORS.bull_pin : COLORS.bear_pin)
            : (r.direction === 'bull' ? COLORS.bull_engulf : COLORS.bear_engulf))
          : COLORS.doji

        values.push({
          title: '',
          value: { text: `${patternLabel}${dirLabel} str:${'●'.repeat(r.strength)}`, color: colorKey }
        })
      }
    }

    if (r.volumeSpike && showVolSpike) {
      const isBuy = r.volSpikeDir === 'bull'
      values.push({
        title: '',
        value: {
          text: isBuy ? '⚡ Buy Volume Spike' : '⚡ Sell Volume Spike',
          color: isBuy ? '#00E676' : '#FF5252'
        }
      })
    }

    values.push({
      title: '',
      value: {
        text: `Wick: ${r.wickRatio?.toFixed(1)}× | Body: ${r.bodyPercent?.toFixed(0)}%`,
        color: '#78909C'
      }
    })

    return { name: 'Price Action', calcParamsText: '', icons, values }
  }
}

export default priceaction
