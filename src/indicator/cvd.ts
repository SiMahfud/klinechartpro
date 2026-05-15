/**
 * CVD - Cumulative Volume Delta indicator
 * 
 * Inspired by TradingView's "CVD - Cumulative Volume Delta Candles" indicator.
 * 
 * Volume Delta estimates buying vs selling pressure per bar:
 * - If close > open → volume is classified as buying (up volume)
 * - If close < open → volume is classified as selling (down volume)
 * - If close == open → tie-breaking via close vs previous close
 * 
 * The CVD is the running cumulative sum of volume delta across all bars.
 * Rendered as candles (OHLC) in a sub-pane with a zero line.
 * 
 * Features:
 * - CVD candles with OHLC
 * - Optional Moving Average overlay
 * - Bullish/Bearish divergence detection with visual markers
 * 
 * calcParams layout:
 *   [0] MA Period        (default 20)
 *   [1] Reset Mode       (0=None, 1=Daily, 2=Weekly)
 *   [2] Show MA          (1=Yes, 0=No)
 *   [3] Show Divergence  (1=Yes, 0=No)
 *   [4] Divergence Lookback (default 5, pivot detection window)
 */

import { IndicatorTemplate, KLineData, IndicatorSeries, IndicatorFigureStylesCallbackData } from 'klinecharts'

export interface CvdResult {
  cvdOpen: number | undefined
  cvdHigh: number | undefined
  cvdLow: number | undefined
  cvdClose: number | undefined
  delta: number | undefined
  totalVolume: number | undefined
  ma: number | undefined
  /** 'bull' = bullish divergence, 'bear' = bearish divergence, undefined = none */
  divergence: 'bull' | 'bear' | undefined
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

  if (prev) {
    if (current.close > prev.close) return vol
    if (current.close < prev.close) return -vol
  }

  return vol
}

// ──────────────────────────────────────────────
// Pivot Detection Helpers
// ──────────────────────────────────────────────

/**
 * Check if index `i` is a pivot low within a window of `lookback` bars each side.
 */
function isPivotLow (values: number[], i: number, lookback: number): boolean {
  if (i < lookback || i >= values.length - lookback) return false
  const val = values[i]
  for (let j = 1; j <= lookback; j++) {
    if (values[i - j] <= val || values[i + j] <= val) return false
  }
  return true
}

/**
 * Check if index `i` is a pivot high within a window of `lookback` bars each side.
 */
function isPivotHigh (values: number[], i: number, lookback: number): boolean {
  if (i < lookback || i >= values.length - lookback) return false
  const val = values[i]
  for (let j = 1; j <= lookback; j++) {
    if (values[i - j] >= val || values[i + j] >= val) return false
  }
  return true
}

// ──────────────────────────────────────────────
// Divergence Detection
// ──────────────────────────────────────────────

interface PivotPoint {
  index: number
  priceValue: number
  cvdValue: number
}

/**
 * Detect divergences by comparing consecutive swing pivots.
 * 
 * Bullish divergence: Price makes lower low, CVD makes higher low
 * Bearish divergence: Price makes higher high, CVD makes lower high
 * 
 * Marks the divergence at the SECOND pivot point (the confirmation bar).
 */
function detectDivergences (
  dataList: KLineData[],
  cvdCloses: number[],
  lookback: number
): Map<number, 'bull' | 'bear'> {
  const divergences = new Map<number, 'bull' | 'bear'>()

  const priceLows = dataList.map(d => d.low)
  const priceHighs = dataList.map(d => d.high)

  // Collect pivot lows and highs
  const pivotLows: PivotPoint[] = []
  const pivotHighs: PivotPoint[] = []

  for (let i = lookback; i < dataList.length - lookback; i++) {
    if (isPivotLow(priceLows, i, lookback)) {
      pivotLows.push({ index: i, priceValue: priceLows[i], cvdValue: cvdCloses[i] })
    }
    if (isPivotHigh(priceHighs, i, lookback)) {
      pivotHighs.push({ index: i, priceValue: priceHighs[i], cvdValue: cvdCloses[i] })
    }
  }

  // Detect bullish divergence: consecutive pivot lows
  for (let k = 1; k < pivotLows.length; k++) {
    const prev = pivotLows[k - 1]
    const curr = pivotLows[k]
    // Price: lower low, CVD: higher low → bullish divergence
    if (curr.priceValue < prev.priceValue && curr.cvdValue > prev.cvdValue) {
      divergences.set(curr.index, 'bull')
    }
  }

  // Detect bearish divergence: consecutive pivot highs
  for (let k = 1; k < pivotHighs.length; k++) {
    const prev = pivotHighs[k - 1]
    const curr = pivotHighs[k]
    // Price: higher high, CVD: lower high → bearish divergence
    if (curr.priceValue > prev.priceValue && curr.cvdValue < prev.cvdValue) {
      divergences.set(curr.index, 'bear')
    }
  }

  return divergences
}

// ──────────────────────────────────────────────
// Indicator Definition
// ──────────────────────────────────────────────

const cvd: IndicatorTemplate<CvdResult> = {
  name: 'CVD',
  shortName: 'CVD',
  series: IndicatorSeries.Normal,
  shouldFormatBigNumber: true,
  precision: 0,
  // calcParams: [maPeriod, resetMode, showMA, showDivergence, divLookback]
  calcParams: [20, 0, 1, 1, 5],
  figures: [
    {
      key: 'cvdClose',
      title: 'CVD: ',
      type: 'line',
      styles: (data: IndicatorFigureStylesCallbackData<CvdResult>, _indicator, _defaultStyles) => {
        const current = data.current.indicatorData
        if (current) {
          const isUp = (current.delta ?? 0) >= 0
          return { color: isUp ? '#00C076' : '#EF5350' }
        }
        return {}
      }
    }
  ],
  calc: (dataList: KLineData[], indicator) => {
    const params = indicator.calcParams
    const maPeriod = params[0] as number
    const resetMode = params[1] as number
    const showMA = params[2] as number
    const showDivergence = params[3] as number
    const divLookback = params[4] as number

    const result: CvdResult[] = []
    const cvdCloses: number[] = []
    let cvdAccum = 0

    // ─── Pass 1: Calculate CVD OHLC + MA ───
    for (let i = 0; i < dataList.length; i++) {
      const current = dataList[i]
      const prev = i > 0 ? dataList[i - 1] : null

      // Reset check
      let shouldReset = false
      if (resetMode > 0 && prev) {
        const cd = new Date(current.timestamp)
        const pd = new Date(prev.timestamp)
        if (resetMode === 1) {
          shouldReset = cd.getUTCDate() !== pd.getUTCDate() ||
                        cd.getUTCMonth() !== pd.getUTCMonth() ||
                        cd.getUTCFullYear() !== pd.getUTCFullYear()
        } else if (resetMode === 2) {
          shouldReset = cd.getUTCDay() < pd.getUTCDay() ||
                        (current.timestamp - prev.timestamp) >= 7 * 24 * 60 * 60 * 1000
        }
      }
      if (shouldReset) cvdAccum = 0

      const delta = calcVolumeDelta(current, prev)
      const totalVolume = current.volume ?? 0

      const cvdOpen = cvdAccum
      const cvdClose = cvdAccum + delta

      // Wick estimation using price range proportions
      const range = current.high - current.low
      const upWick = range > 0 ? ((current.high - Math.max(current.open, current.close)) / range) * totalVolume : 0
      const downWick = range > 0 ? ((Math.min(current.open, current.close) - current.low) / range) * totalVolume : 0

      let cvdHigh: number, cvdLow: number
      if (delta >= 0) {
        cvdHigh = cvdOpen + Math.abs(delta) + upWick
        cvdLow = cvdOpen - downWick
      } else {
        cvdHigh = cvdOpen + upWick
        cvdLow = cvdOpen - Math.abs(delta) - downWick
      }
      cvdHigh = Math.max(cvdHigh, cvdOpen, cvdClose)
      cvdLow = Math.min(cvdLow, cvdOpen, cvdClose)

      cvdAccum = cvdClose
      cvdCloses.push(cvdClose)

      // MA calculation
      let ma: number | undefined = undefined
      if (showMA === 1) {
        if (resetMode === 0 && i >= maPeriod - 1) {
          let sum = 0
          for (let j = i - maPeriod + 1; j <= i; j++) {
            sum += cvdCloses[j]
          }
          ma = sum / maPeriod
        } else if (resetMode > 0) {
          // Cumulative average since last reset
          let sum = 0
          let count = 0
          for (let j = i; j >= 0; j--) {
            sum += cvdCloses[j]
            count++
            if (j > 0) {
              const d1 = new Date(dataList[j].timestamp)
              const d0 = new Date(dataList[j - 1].timestamp)
              if (resetMode === 1 && d1.getUTCDate() !== d0.getUTCDate()) break
              if (resetMode === 2 && d1.getUTCDay() < d0.getUTCDay()) break
            }
          }
          ma = sum / count
        }
      }

      result.push({
        cvdOpen, cvdHigh, cvdLow, cvdClose,
        delta, totalVolume, ma,
        divergence: undefined
      })
    }

    // ─── Pass 2: Detect divergences ───
    if (showDivergence === 1 && dataList.length > divLookback * 2) {
      const divergences = detectDivergences(dataList, cvdCloses, divLookback)
      divergences.forEach((type, idx) => {
        if (result[idx]) {
          result[idx].divergence = type
        }
      })
    }

    return result
  },

  // ──────────────────────────────────────────
  // Custom Drawing
  // ──────────────────────────────────────────
  draw: ({ ctx, kLineDataList, indicator, visibleRange, bounding, barSpace, xAxis, yAxis }) => {
    const result = indicator.result
    const showMA = indicator.calcParams[2] as number
    const showDivergence = indicator.calcParams[3] as number

    const halfBarWidth = Math.max(1, barSpace.halfGapBar)

    // ─── Draw CVD Candles ───
    for (let i = visibleRange.from; i < visibleRange.to; i++) {
      const data = result[i]
      if (!data || data.cvdOpen === undefined) continue

      const x = xAxis.convertToPixel(i)
      const yOpen = yAxis.convertToPixel(data.cvdOpen)
      const yClose = yAxis.convertToPixel(data.cvdClose!)
      const yHigh = yAxis.convertToPixel(data.cvdHigh!)
      const yLow = yAxis.convertToPixel(data.cvdLow!)

      const isUp = (data.delta ?? 0) >= 0
      const bodyColor = isUp ? '#00C076' : '#EF5350'

      // Wick
      ctx.strokeStyle = bodyColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, yHigh)
      ctx.lineTo(x, yLow)
      ctx.stroke()

      // Body
      const bodyTop = Math.min(yOpen, yClose)
      const bodyBottom = Math.max(yOpen, yClose)
      const bodyHeight = Math.max(1, bodyBottom - bodyTop)

      ctx.fillStyle = bodyColor
      ctx.fillRect(x - halfBarWidth, bodyTop, halfBarWidth * 2, bodyHeight)
      ctx.strokeStyle = bodyColor
      ctx.lineWidth = 1
      ctx.strokeRect(x - halfBarWidth, bodyTop, halfBarWidth * 2, bodyHeight)
    }

    // ─── Draw Zero Line ───
    const zeroY = yAxis.convertToPixel(0)
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, zeroY)
    ctx.lineTo(bounding.width, zeroY)
    ctx.stroke()
    ctx.setLineDash([])

    // ─── Draw MA Line ───
    if (showMA === 1) {
      ctx.strokeStyle = '#FFB74D'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      let started = false
      for (let i = visibleRange.from; i < visibleRange.to; i++) {
        const data = result[i]
        if (!data || data.ma === undefined) continue
        const x = xAxis.convertToPixel(i)
        const y = yAxis.convertToPixel(data.ma)
        if (!started) { ctx.moveTo(x, y); started = true }
        else { ctx.lineTo(x, y) }
      }
      if (started) ctx.stroke()
    }

    // ─── Draw Divergence Markers ───
    if (showDivergence === 1) {
      const markerSize = Math.max(6, barSpace.bar * 0.6)

      for (let i = visibleRange.from; i < visibleRange.to; i++) {
        const data = result[i]
        if (!data || !data.divergence) continue

        const x = xAxis.convertToPixel(i)
        const isBull = data.divergence === 'bull'

        if (isBull) {
          // ▲ Bullish divergence marker — below the candle low
          const yLow = yAxis.convertToPixel(data.cvdLow!)
          const markerY = yLow + markerSize + 4

          // Draw triangle pointing up
          ctx.fillStyle = '#00E5FF'
          ctx.beginPath()
          ctx.moveTo(x, markerY - markerSize)
          ctx.lineTo(x - markerSize * 0.6, markerY)
          ctx.lineTo(x + markerSize * 0.6, markerY)
          ctx.closePath()
          ctx.fill()

          // Label "Bull"
          ctx.fillStyle = '#00E5FF'
          ctx.font = `bold ${Math.max(9, Math.min(11, barSpace.bar))}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillText('B', x, markerY + 2)
        } else {
          // ▼ Bearish divergence marker — above the candle high
          const yHigh = yAxis.convertToPixel(data.cvdHigh!)
          const markerY = yHigh - markerSize - 4

          // Draw triangle pointing down
          ctx.fillStyle = '#FF6D00'
          ctx.beginPath()
          ctx.moveTo(x, markerY + markerSize)
          ctx.lineTo(x - markerSize * 0.6, markerY)
          ctx.lineTo(x + markerSize * 0.6, markerY)
          ctx.closePath()
          ctx.fill()

          // Label "Bear"
          ctx.fillStyle = '#FF6D00'
          ctx.font = `bold ${Math.max(9, Math.min(11, barSpace.bar))}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText('S', x, markerY - 2)
        }
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
    const showMA = indicator.calcParams[2] as number

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
      return { name: 'CVD', calcParamsText: '', icons, values: [] }
    }

    const fmt = (v: number | undefined): string => {
      if (v === undefined || v === null) return '-'
      const abs = Math.abs(v)
      if (abs >= 1e9) return (v / 1e9).toFixed(2) + 'B'
      if (abs >= 1e6) return (v / 1e6).toFixed(2) + 'M'
      if (abs >= 1e3) return (v / 1e3).toFixed(2) + 'K'
      return v.toFixed(0)
    }

    const isUp = (data.delta ?? 0) >= 0
    const color = isUp ? '#00C076' : '#EF5350'

    const values: any[] = [
      { title: 'O: ', value: { text: fmt(data.cvdOpen), color } },
      { title: 'H: ', value: { text: fmt(data.cvdHigh), color } },
      { title: 'L: ', value: { text: fmt(data.cvdLow), color } },
      { title: 'C: ', value: { text: fmt(data.cvdClose), color } },
      { title: 'Δ: ', value: { text: fmt(data.delta), color } }
    ]

    if (showMA === 1 && data.ma !== undefined) {
      values.push({ title: 'MA: ', value: { text: fmt(data.ma), color: '#FFB74D' } })
    }

    if (data.divergence) {
      const divColor = data.divergence === 'bull' ? '#00E5FF' : '#FF6D00'
      const divText = data.divergence === 'bull' ? '▲ Bullish Div' : '▼ Bearish Div'
      values.push({ title: '', value: { text: divText, color: divColor } })
    }

    return {
      name: 'CVD',
      calcParamsText: `(${indicator.calcParams[0]})`,
      icons,
      values
    }
  }
}

export default cvd
