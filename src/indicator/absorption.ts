/**
 * ABSORPTION - Volume Absorption Indicator
 * 
 * Detects when one side of the market (buyer/seller) absorbs the opposing
 * pressure without allowing significant price movement.
 * 
 * Detection Logic:
 * - Bullish Absorption: High sell volume (negative delta) but price holds/rises.
 *   Indicates hidden buying (smart money accumulation).
 * - Bearish Absorption: High buy volume (positive delta) but price holds/drops.
 *   Indicates hidden selling (smart money distribution).
 * 
 * Rendered as a main chart overlay with:
 * - Glowing bubble circles around absorption candles
 * - Diamond (◆) markers above/below candles
 * - Optional background highlight columns
 * 
 * calcParams layout:
 *   [0] Volume MA Period     (default 20)  - baseline for "above average" volume
 *   [1] Sensitivity          (default 2)   - threshold multiplier (1=sensitive, 3=conservative)
 *   [2] Show Bubbles         (1=Yes, 0=No)
 *   [3] Show Background      (1=Yes, 0=No)
 */

import { IndicatorTemplate, KLineData, IndicatorSeries, IndicatorFigureStylesCallbackData } from 'klinecharts'

export interface AbsorptionResult {
  /** 'bull' = bullish absorption, 'bear' = bearish absorption, undefined = none */
  absorption: 'bull' | 'bear' | undefined
  /** Absorption strength score (0-1), used to scale bubble size */
  strength: number | undefined
  /** Volume delta for the bar */
  delta: number | undefined
  /** Volume MA value */
  volumeMA: number | undefined
  /** ATR value for context */
  atr: number | undefined
  /** Placeholder for figure rendering (not actually drawn by figures) */
  signal: number | undefined
}

// ──────────────────────────────────────────────
// Volume Delta Classification
// ──────────────────────────────────────────────

function calcVolumeDelta (
  current: KLineData,
  prev: KLineData | null
): number {
  const vol = current.volume ?? 0
  if (vol === 0) return 0

  if (current.close > current.open) return vol
  if (current.close < current.open) return -vol

  // Tie-breaking via previous close
  if (prev) {
    if (current.close > prev.close) return vol
    if (current.close < prev.close) return -vol
  }

  return vol
}

// ──────────────────────────────────────────────
// ATR (Average True Range) Calculation
// ──────────────────────────────────────────────

function calcTrueRange (current: KLineData, prev: KLineData | null): number {
  if (!prev) return current.high - current.low
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - prev.close),
    Math.abs(current.low - prev.close)
  )
}

// ──────────────────────────────────────────────
// Indicator Definition
// ──────────────────────────────────────────────

const absorption: IndicatorTemplate<AbsorptionResult> = {
  name: 'ABSORPTION',
  shortName: 'Absorption',
  series: IndicatorSeries.Price,  // Overlay on main chart
  precision: 4,
  // calcParams: [volMAPeriod, sensitivity, showBubbles, showBackground]
  calcParams: [20, 2, 1, 1],
  figures: [
    {
      key: 'signal',
      title: '',
      type: 'line',
      styles: () => ({ color: 'transparent' })
    }
  ],
  calc: (dataList: KLineData[], indicator) => {
    const params = indicator.calcParams
    const volMAPeriod = params[0] as number
    const sensitivity = params[1] as number

    const result: AbsorptionResult[] = []
    const volumes: number[] = []
    const trueRanges: number[] = []

    // ─── Pass 1: Calculate volume deltas, volume MA, and ATR ───
    for (let i = 0; i < dataList.length; i++) {
      const current = dataList[i]
      const prev = i > 0 ? dataList[i - 1] : null

      const vol = current.volume ?? 0
      volumes.push(vol)

      const tr = calcTrueRange(current, prev)
      trueRanges.push(tr)

      // Calculate Volume MA
      let volumeMA: number | undefined = undefined
      if (i >= volMAPeriod - 1) {
        let sum = 0
        for (let j = i - volMAPeriod + 1; j <= i; j++) {
          sum += volumes[j]
        }
        volumeMA = sum / volMAPeriod
      }

      // Calculate ATR
      let atr: number | undefined = undefined
      if (i >= volMAPeriod - 1) {
        let sum = 0
        for (let j = i - volMAPeriod + 1; j <= i; j++) {
          sum += trueRanges[j]
        }
        atr = sum / volMAPeriod
      }

      // Not enough data yet
      if (volumeMA === undefined || atr === undefined || atr === 0) {
        result.push({
          absorption: undefined,
          strength: undefined,
          delta: calcVolumeDelta(current, prev),
          volumeMA: undefined,
          atr: undefined,
          signal: undefined
        })
        continue
      }

      const delta = calcVolumeDelta(current, prev)
      const absDelta = Math.abs(delta)
      const priceRange = current.high - current.low
      const bodySize = Math.abs(current.close - current.open)

      // ─── Absorption Detection ───
      // Core idea: High volume + small price movement relative to ATR
      
      // Volume must be above average
      const isHighVolume = vol > volumeMA * (sensitivity * 0.5)
      
      // Price range should be small relative to ATR (absorption = price doesn't move much)
      const isSmallRange = priceRange < atr * (1.5 / sensitivity)
      
      // Body should be small relative to the range (indecision/absorption)
      const isSmallBody = priceRange > 0 ? (bodySize / priceRange) < 0.6 : true

      // Alternative: large wick absorption (price rejected)
      const upperWick = current.high - Math.max(current.open, current.close)
      const lowerWick = Math.min(current.open, current.close) - current.low
      const hasLargeUpperWick = priceRange > 0 && (upperWick / priceRange) > 0.5
      const hasLargeLowerWick = priceRange > 0 && (lowerWick / priceRange) > 0.5

      let absorptionType: 'bull' | 'bear' | undefined = undefined
      let strength = 0

      if (isHighVolume) {
        // ── Bullish Absorption ──
        // Scenario 1: Negative delta (sell pressure) but price doesn't drop
        //             OR small body with large lower wick (rejection of selling)
        const isBullishAbsorption = (
          delta < 0 && (current.close >= current.open || hasLargeLowerWick) &&
          (isSmallRange || isSmallBody || hasLargeLowerWick)
        )

        // ── Bearish Absorption ──
        // Scenario 2: Positive delta (buy pressure) but price doesn't rise
        //             OR small body with large upper wick (rejection of buying)
        const isBearishAbsorption = (
          delta > 0 && (current.close <= current.open || hasLargeUpperWick) &&
          (isSmallRange || isSmallBody || hasLargeUpperWick)
        )

        if (isBullishAbsorption) {
          absorptionType = 'bull'
          // Strength = how much volume relative to average * how little price moved
          const volRatio = Math.min(vol / volumeMA, 3) / 3  // 0-1
          const rangeRatio = 1 - Math.min(priceRange / atr, 1)  // 0-1 (smaller range = higher)
          strength = (volRatio * 0.6 + rangeRatio * 0.4)
        } else if (isBearishAbsorption) {
          absorptionType = 'bear'
          const volRatio = Math.min(vol / volumeMA, 3) / 3
          const rangeRatio = 1 - Math.min(priceRange / atr, 1)
          strength = (volRatio * 0.6 + rangeRatio * 0.4)
        }
      }

      result.push({
        absorption: absorptionType,
        strength: absorptionType ? strength : undefined,
        delta,
        volumeMA,
        atr,
        signal: absorptionType ? (absorptionType === 'bull' ? current.low : current.high) : undefined
      })
    }

    return result
  },

  // ──────────────────────────────────────────
  // Custom Drawing
  // ──────────────────────────────────────────
  draw: ({ ctx, kLineDataList, indicator, visibleRange, bounding, barSpace, xAxis, yAxis }) => {
    const result = indicator.result
    const showBubbles = indicator.calcParams[2] as number
    const showBackground = indicator.calcParams[3] as number

    const BULL_COLOR = '#00E5FF'     // Cyan
    const BEAR_COLOR = '#FF9100'     // Orange/Amber
    const BULL_GLOW = 'rgba(0, 229, 255, 0.12)'
    const BEAR_GLOW = 'rgba(255, 145, 0, 0.12)'
    const BULL_BG = 'rgba(0, 229, 255, 0.06)'
    const BEAR_BG = 'rgba(255, 145, 0, 0.06)'

    for (let i = visibleRange.from; i < visibleRange.to; i++) {
      const data = result[i]
      if (!data || !data.absorption) continue

      const kline = kLineDataList[i]
      if (!kline) continue
      const x = xAxis.convertToPixel(i)
      const isBull = data.absorption === 'bull'
      const strength = data.strength ?? 0.5

      const yHigh = yAxis.convertToPixel(kline.high)
      const yLow = yAxis.convertToPixel(kline.low)
      const yOpen = yAxis.convertToPixel(kline.open)
      const yClose = yAxis.convertToPixel(kline.close)

      // Guard: skip if any coordinate is non-finite (prevents canvas errors)
      if (!isFinite(x) || !isFinite(yHigh) || !isFinite(yLow)) continue

      const candleCenter = (yHigh + yLow) / 2
      const candleHeight = Math.abs(yLow - yHigh)

      const color = isBull ? BULL_COLOR : BEAR_COLOR
      const glowColor = isBull ? BULL_GLOW : BEAR_GLOW

      // ─── 1. Background Highlight Column ───
      if (showBackground === 1) {
        const bgColor = isBull ? BULL_BG : BEAR_BG
        const halfBar = Math.max(barSpace.halfGapBar, 2)
        ctx.fillStyle = bgColor
        ctx.fillRect(x - halfBar - 1, 0, (halfBar + 1) * 2, bounding.height)
      }

      // ─── 2. Bubble / Glow Effect ───
      if (showBubbles === 1) {
        // Bubble radius scales with strength and bar space
        const minRadius = Math.max(barSpace.bar * 0.8, 8)
        const maxRadius = Math.max(barSpace.bar * 2.0, 20)
        const radius = minRadius + (maxRadius - minRadius) * strength

        // Outer glow (larger, more transparent)
        const outerGradient = ctx.createRadialGradient(x, candleCenter, 0, x, candleCenter, radius * 1.5)
        outerGradient.addColorStop(0, isBull ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 145, 0, 0.15)')
        outerGradient.addColorStop(0.5, isBull ? 'rgba(0, 229, 255, 0.06)' : 'rgba(255, 145, 0, 0.06)')
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.beginPath()
        ctx.arc(x, candleCenter, radius * 1.5, 0, Math.PI * 2)
        ctx.fillStyle = outerGradient
        ctx.fill()

        // Inner bubble ring
        ctx.beginPath()
        ctx.arc(x, candleCenter, radius, 0, Math.PI * 2)
        ctx.strokeStyle = isBull ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 145, 0, 0.35)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Pulsating inner dot
        const innerRadius = radius * 0.2 * (0.8 + strength * 0.4)
        const innerGradient = ctx.createRadialGradient(x, candleCenter, 0, x, candleCenter, innerRadius)
        innerGradient.addColorStop(0, isBull ? 'rgba(0, 229, 255, 0.5)' : 'rgba(255, 145, 0, 0.5)')
        innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.beginPath()
        ctx.arc(x, candleCenter, innerRadius, 0, Math.PI * 2)
        ctx.fillStyle = innerGradient
        ctx.fill()
      }

      // ─── 3. Diamond Marker (◆) ───
      const diamondSize = Math.max(5, Math.min(barSpace.bar * 0.35, 8))
      const markerGap = 6

      if (isBull) {
        // Diamond below the candle low
        const markerY = yLow + markerGap + diamondSize
        drawDiamond(ctx, x, markerY, diamondSize, color)
      } else {
        // Diamond above the candle high
        const markerY = yHigh - markerGap - diamondSize
        drawDiamond(ctx, x, markerY, diamondSize, color)
      }

      // ─── 4. Small Label ───
      const labelSize = Math.max(8, Math.min(10, barSpace.bar * 0.8))
      ctx.font = `bold ${labelSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = color

      if (isBull) {
        const labelY = yLow + markerGap + diamondSize * 2 + labelSize + 2
        ctx.textBaseline = 'top'
        ctx.fillText('A', x, labelY - labelSize)
      } else {
        const labelY = yHigh - markerGap - diamondSize * 2 - 4
        ctx.textBaseline = 'bottom'
        ctx.fillText('A', x, labelY)
      }
    }

    return true
  },

  // ──────────────────────────────────────────
  // Custom Tooltip
  // ──────────────────────────────────────────
  createTooltipDataSource: ({ indicator, crosshair, defaultStyles }) => {
    const result = indicator.result
    const dataIndex = crosshair.dataIndex ?? 0
    const data = result[dataIndex]

    const icons: any[] = []
    if (indicator.visible) {
      icons.push(defaultStyles.tooltip.icons[1])
      icons.push(defaultStyles.tooltip.icons[2])
      icons.push(defaultStyles.tooltip.icons[3])
    } else {
      icons.push(defaultStyles.tooltip.icons[0])
      icons.push(defaultStyles.tooltip.icons[2])
      icons.push(defaultStyles.tooltip.icons[3])
    }

    if (!data) {
      return { name: 'Absorption', calcParamsText: '', icons, values: [] }
    }

    const fmt = (v: number | undefined): string => {
      if (v === undefined || v === null) return '-'
      const abs = Math.abs(v)
      if (abs >= 1e9) return (v / 1e9).toFixed(2) + 'B'
      if (abs >= 1e6) return (v / 1e6).toFixed(2) + 'M'
      if (abs >= 1e3) return (v / 1e3).toFixed(2) + 'K'
      return v.toFixed(0)
    }

    const values: any[] = []

    if (data.absorption) {
      const isBull = data.absorption === 'bull'
      const color = isBull ? '#00E5FF' : '#FF9100'
      const label = isBull ? '◆ Bullish Absorption' : '◆ Bearish Absorption'
      const strengthPct = data.strength !== undefined ? (data.strength * 100).toFixed(0) + '%' : '-'

      values.push({ title: '', value: { text: label, color } })
      values.push({ title: 'Strength: ', value: { text: strengthPct, color } })
    }

    if (data.delta !== undefined) {
      const deltaColor = data.delta >= 0 ? '#00C076' : '#EF5350'
      values.push({ title: 'Δ: ', value: { text: fmt(data.delta), color: deltaColor } })
    }

    if (data.volumeMA !== undefined) {
      values.push({ title: 'Vol MA: ', value: { text: fmt(data.volumeMA), color: '#888' } })
    }

    if (data.atr !== undefined) {
      values.push({ title: 'ATR: ', value: { text: data.atr.toFixed(4), color: '#888' } })
    }

    return {
      name: 'Absorption',
      calcParamsText: `(${indicator.calcParams[0]}, ${indicator.calcParams[1]})`,
      icons,
      values
    }
  }
}

// ──────────────────────────────────────────────
// Drawing Helpers
// ──────────────────────────────────────────────

/**
 * Draw a filled diamond shape at the given position.
 */
function drawDiamond (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - size)        // top
  ctx.lineTo(x + size, y)        // right
  ctx.lineTo(x, y + size)        // bottom
  ctx.lineTo(x - size, y)        // left
  ctx.closePath()
  ctx.fill()

  // Subtle outline
  ctx.strokeStyle = color
  ctx.lineWidth = 0.5
  ctx.globalAlpha = 0.6
  ctx.stroke()
  ctx.globalAlpha = 1.0
}

export default absorption
