/**
 * MTFSR — Multi-Timeframe Support & Resistance Zones
 * 
 * Ported from srZones.js with enhanced multi-timeframe support.
 * Uses organic wick-to-body zone detection, touch validation,
 * broken zone removal, and weighted scoring.
 *
 * calcParams:
 *   [0] Lookback Bars     (200)  — How many bars to scan
 *   [1] Pivot Strength    (3)    — Pivot detection window
 *   [2] Min Touch Count   (2)    — Minimum touches to validate
 *   [3] Max Zones/Side    (5)    — Max S or R zones per TF
 *   [4] Show 1H           (1/0)
 *   [5] Show 4H           (1/0)
 *   [6] Show Daily        (1/0)
 *   [7] Show Weekly       (1/0)
 *   [8] Show Monthly      (1/0)
 *   [9] Data Mode         (0=Synthetic, 1=API)
 */

import { IndicatorTemplate, KLineData, IndicatorSeries } from 'klinecharts'

// ── Types ──

interface SRZone {
  type: 'RESISTANCE' | 'SUPPORT'
  top: number
  bottom: number
  left: number          // data index where zone starts
  touchCount: number
  isBroken: boolean
  isValid: boolean
  pivotIndex: number
  recency?: number
  score?: number
  tfLabel: string
  tfColor: string
}

interface TimeframeConfig {
  label: string
  color: string
  period: { multiplier: number, timespan: string }
  paramIndex: number
}

const TF_CONFIGS: TimeframeConfig[] = [
  { label: '1H',  color: '#42A5F5', period: { multiplier: 1, timespan: 'hour' },  paramIndex: 4 },
  { label: '4H',  color: '#AB47BC', period: { multiplier: 4, timespan: 'hour' },  paramIndex: 5 },
  { label: 'D',   color: '#FF7043', period: { multiplier: 1, timespan: 'day' },   paramIndex: 6 },
  { label: 'W',   color: '#26A69A', period: { multiplier: 1, timespan: 'week' },  paramIndex: 7 },
  { label: 'M',   color: '#FFCA28', period: { multiplier: 1, timespan: 'month' }, paramIndex: 8 }
]

// ── TF Rank ──

function getTFRank (ts: string, m: number): number {
  if (ts === 'minute') return 0
  if (ts === 'hour') return m >= 4 ? 2 : 1
  if (ts === 'day') return 3
  if (ts === 'week') return 4
  if (ts === 'month') return 5
  return 0
}

// ── Candle Aggregation ──

function aggregateCandles (dataList: KLineData[], ts: string, mult: number): KLineData[] {
  if (dataList.length === 0) return []
  const result: KLineData[] = []
  let cur: KLineData | null = null
  let curBucket = -1
  for (const bar of dataList) {
    const bucket = getTimeBucket(bar.timestamp, ts, mult)
    if (bucket !== curBucket) {
      if (cur) result.push(cur)
      cur = { timestamp: bar.timestamp, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume ?? 0, turnover: bar.turnover ?? 0 }
      curBucket = bucket
    } else if (cur) {
      cur.high = Math.max(cur.high, bar.high)
      cur.low = Math.min(cur.low, bar.low)
      cur.close = bar.close
      cur.volume = (cur.volume ?? 0) + (bar.volume ?? 0)
    }
  }
  if (cur) result.push(cur)
  return result
}

function getTimeBucket (ts: number, timespan: string, mult: number): number {
  const d = new Date(ts)
  switch (timespan) {
    case 'hour': return d.getUTCFullYear() * 1e6 + (d.getUTCMonth() + 1) * 1e4 + d.getUTCDate() * 100 + Math.floor(d.getUTCHours() / mult)
    case 'day': return d.getUTCFullYear() * 1e4 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
    case 'week': {
      const j = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      return d.getUTCFullYear() * 100 + Math.ceil(((d.getTime() - j.getTime()) / 864e5 + j.getUTCDay() + 1) / 7)
    }
    case 'month': return d.getUTCFullYear() * 100 + (d.getUTCMonth() + 1)
    default: return Math.floor(ts / (mult * 36e5))
  }
}

// ── Pivot Detection (wick-to-body zones) ──

interface Pivot { index: number; price: number; wickTop: number; bodyClose: number; wickBottom: number }

function detectPivotHighs (data: KLineData[], strength: number, startIdx: number): Pivot[] {
  const pivots: Pivot[] = []
  for (let i = Math.max(startIdx, strength); i < data.length - strength; i++) {
    const bar = data[i]
    let ok = true
    for (let j = i - strength; j <= i + strength; j++) {
      if (j !== i && data[j].high >= bar.high) { ok = false; break }
    }
    if (ok) pivots.push({ index: i, price: bar.high, wickTop: bar.high, bodyClose: Math.max(bar.open, bar.close), wickBottom: bar.low })
  }
  return pivots
}

function detectPivotLows (data: KLineData[], strength: number, startIdx: number): Pivot[] {
  const pivots: Pivot[] = []
  for (let i = Math.max(startIdx, strength); i < data.length - strength; i++) {
    const bar = data[i]
    let ok = true
    for (let j = i - strength; j <= i + strength; j++) {
      if (j !== i && data[j].low <= bar.low) { ok = false; break }
    }
    if (ok) pivots.push({ index: i, price: bar.low, wickTop: bar.high, bodyClose: Math.min(bar.open, bar.close), wickBottom: bar.low })
  }
  return pivots
}

// ── Zone Building (organic wick-to-body width) ──

function buildZone (pivot: Pivot, type: 'RESISTANCE' | 'SUPPORT', tfLabel: string, tfColor: string): SRZone {
  const top = type === 'RESISTANCE' ? pivot.wickTop : pivot.bodyClose
  const bottom = type === 'RESISTANCE' ? pivot.bodyClose : pivot.wickBottom
  return { type, top, bottom, left: pivot.index, touchCount: 1, isValid: false, isBroken: false, pivotIndex: pivot.index, tfLabel, tfColor }
}

// ── Merge Overlapping Zones ──

function mergeZones (zones: SRZone[]): SRZone[] {
  if (zones.length === 0) return []
  const heights = zones.map(z => z.top - z.bottom).sort((a, b) => a - b)
  const median = heights[Math.floor(heights.length / 2)] || 0
  const maxW = median * 3
  const sorted = [...zones].sort((a, b) => a.bottom - b.bottom)
  const merged: SRZone[] = []
  for (const z of sorted) {
    let done = false
    for (const m of merged) {
      if (z.bottom <= m.top && z.top >= m.bottom) {
        const nTop = Math.max(z.top, m.top), nBot = Math.min(z.bottom, m.bottom)
        if (maxW === 0 || (nTop - nBot) <= maxW) {
          m.top = nTop; m.bottom = nBot; m.touchCount += z.touchCount; m.left = Math.min(m.left, z.left)
          done = true; break
        }
      }
    }
    if (!done) merged.push({ ...z })
  }
  return merged
}

// ── Validate Zones (touch count + breach detection) ──

function validateZones (zones: SRZone[], data: KLineData[], minTouch: number): SRZone[] {
  const valid: SRZone[] = []
  const lastIdx = data.length - 1
  for (const zone of zones) {
    let touches = 0
    let broken = false
    const zH = zone.top - zone.bottom
    const closeTol = zH * 0.3

    for (let i = zone.left + 1; i < data.length; i++) {
      const bar = data[i]
      if (zone.type === 'RESISTANCE') {
        if (bar.high >= zone.bottom && bar.high <= zone.top && bar.close < zone.bottom + closeTol) touches++
        if (bar.close > zone.top + zH * 0.5) broken = true
      } else {
        if (bar.low <= zone.top && bar.low >= zone.bottom && bar.close > zone.top - closeTol) touches++
        if (bar.close < zone.bottom - zH * 0.5) broken = true
      }
    }
    zone.touchCount = touches
    zone.isBroken = broken
    if (touches >= minTouch && !broken) {
      zone.isValid = true
      zone.recency = zone.pivotIndex / lastIdx
      zone.score = zone.touchCount * 0.6 + (zone.recency ?? 0) * 10 * 0.4
      valid.push(zone)
    }
  }
  valid.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return valid
}

// ── Filter Nearest Zones ──

function filterNearest (zones: SRZone[], price: number, max: number): { resistance: SRZone[], support: SRZone[] } {
  const r: SRZone[] = [], s: SRZone[] = []
  for (const z of zones) {
    if (z.bottom > price || (z.type === 'RESISTANCE' && z.bottom <= price && z.top >= price)) r.push(z)
    else s.push(z)
  }
  r.sort((a, b) => a.bottom - b.bottom)
  s.sort((a, b) => b.top - a.top)
  return { resistance: r.slice(0, max), support: s.slice(0, max) }
}

// ── Full Detection Pipeline ──

function detectZonesOnData (
  data: KLineData[], strength: number, minTouch: number, maxZones: number,
  currentPrice: number, tfLabel: string, tfColor: string, lookback: number
): { resistance: SRZone[], support: SRZone[] } {
  if (data.length < strength * 2 + 1) return { resistance: [], support: [] }
  const startIdx = Math.max(0, data.length - lookback)
  const pivotHighs = detectPivotHighs(data, strength, startIdx)
  const pivotLows = detectPivotLows(data, strength, startIdx)
  const rawR = pivotHighs.map(p => buildZone(p, 'RESISTANCE', tfLabel, tfColor))
  const rawS = pivotLows.map(p => buildZone(p, 'SUPPORT', tfLabel, tfColor))
  const mergedR = mergeZones(rawR)
  const mergedS = mergeZones(rawS)
  const validR = validateZones(mergedR, data, minTouch)
  const validS = validateZones(mergedS, data, minTouch)
  return filterNearest([...validR, ...validS], currentPrice, maxZones)
}

// ── Cache ──

let _cachedResult: { resistance: SRZone[], support: SRZone[] } = { resistance: [], support: [] }
let _cacheLen = 0
let _cacheKey = ''

// ── Helpers ──

function hexRGBA (hex: string, a: number): string {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`
}

function touchAlpha (count: number): number {
  return Math.min(0.50, 0.08 + count * 0.07)
}

function getPrecision (price: number): number {
  const s = price?.toString() || ''
  const d = s.split('.')[1] || ''
  return Math.min(5, Math.max(2, d.length))
}

// ── Indicator ──

const mtfsr: IndicatorTemplate = {
  name: 'MTFSR',
  shortName: 'MTF S/R',
  series: IndicatorSeries.Price,
  precision: 4,
  calcParams: [200, 3, 2, 5, 1, 1, 1, 1, 0, 0],
  figures: [{ key: 'signal', title: '', type: 'line', styles: () => ({ color: 'transparent' }) }],

  calc: (dataList: KLineData[], indicator: any) => {
    const p = indicator.calcParams
    const lookback = p[0] as number
    const strength = p[1] as number
    const minTouch = p[2] as number
    const maxZones = p[3] as number
    const dataMode = p[9] as number

    const key = p.join(',')
    if (dataList.length === _cacheLen && key === _cacheKey) {
      return dataList.map(() => ({ signal: undefined }))
    }
    _cacheLen = dataList.length
    _cacheKey = key

    const currentPrice = dataList.length > 0 ? dataList[dataList.length - 1].close : 0
    if (currentPrice === 0) {
      _cachedResult = { resistance: [], support: [] }
      return dataList.map(() => ({ signal: undefined }))
    }

    const chartPeriod = (window as any)?._mtfDataService?.getCurrentPeriod?.()
    const chartRank = chartPeriod ? getTFRank(chartPeriod.timespan, chartPeriod.multiplier) : 0

    const allR: SRZone[] = [], allS: SRZone[] = []

    for (const tf of TF_CONFIGS) {
      if ((p[tf.paramIndex] as number) !== 1) continue
      const tfRank = getTFRank(tf.period.timespan, tf.period.multiplier)

      let tfData: KLineData[] | null = null
      if (dataMode === 1) {
        const svc = (window as any)?._mtfDataService
        if (svc) {
          tfData = svc.getCachedData(tf.period)
          if (!tfData) svc.getTimeframeData(tf.period, 500).catch(() => {})
        }
      }
      if (!tfData) {
        if (tfRank <= chartRank) continue
        tfData = aggregateCandles(dataList, tf.period.timespan, tf.period.multiplier)
      }
      if (tfData.length < strength * 2 + 1) continue

      // Use higher pivot strength for higher TFs
      const htfStrength = Math.max(strength, Math.ceil(strength * (1 + (tfRank - chartRank) * 0.15)))
      const htfMinTouch = Math.max(1, minTouch - 1)
      const zones = detectZonesOnData(tfData, htfStrength, htfMinTouch, Math.min(maxZones, 3), currentPrice, tf.label, tf.color, lookback)
      allR.push(...zones.resistance)
      allS.push(...zones.support)
    }

    _cachedResult = { resistance: allR, support: allS }

    // Build per-bar results for strategy builder compatibility
    return dataList.map((bar) => {
      const price = bar.close
      // Find nearest support (closest zone below or containing price)
      let nearestSupport: number | undefined
      for (const z of allS) {
        if (z.top <= price || (price >= z.bottom && price <= z.top)) {
          nearestSupport = z.top
          break
        }
      }
      // Find nearest resistance (closest zone above or containing price)
      let nearestResistance: number | undefined
      for (const z of allR) {
        if (z.bottom >= price || (price >= z.bottom && price <= z.top)) {
          nearestResistance = z.bottom
          break
        }
      }
      // Check if price is inside any zone
      const insideSupport = allS.some(z => price >= z.bottom && price <= z.top) ? 1 : 0
      const insideResistance = allR.some(z => price >= z.bottom && price <= z.top) ? 1 : 0
      const zoneCount = allR.length + allS.length

      return {
        signal: undefined,
        nearestSupport,
        nearestResistance,
        insideSupport,
        insideResistance,
        zoneCount
      }
    })
  },

  draw: ({ ctx, bounding, yAxis, xAxis, indicator }: any) => {
    const { resistance, support } = _cachedResult
    if (resistance.length === 0 && support.length === 0) return false

    const dataList = (window as any)?._klineChartInstance?.getDataList?.() ?? []
    const lastIdx = dataList.length - 1
    const currentPrice = dataList[lastIdx]?.close ?? 0
    const precision = getPrecision(currentPrice)
    const chartW = bounding.width
    const barSpace = (window as any)?._klineChartInstance?.getBarSpace?.()
    const lastBarX = xAxis.convertToPixel(lastIdx)
    const rightEdge = lastBarX + (barSpace?.bar ?? 6) * 5

    ctx.save()

    const drawSet = (zones: SRZone[], isResistance: boolean) => {
      for (const zone of zones) {
        const baseAlpha = touchAlpha(zone.touchCount)
        const alpha = Math.min(0.70, baseAlpha * 1.8)
        const yTop = yAxis.convertToPixel(zone.top)
        const yBottom = yAxis.convertToPixel(zone.bottom)
        const rectY = Math.min(yTop, yBottom)
        const rectH = Math.abs(yBottom - yTop)

        if (rectY > bounding.height + 30 || rectY + rectH < -30) continue

        const xLeft = Math.max(0, xAxis.convertToPixel(zone.left))
        const rectW = rightEdge - xLeft

        // Use TF color for fill
        const color = zone.tfColor

        // Zone fill
        ctx.fillStyle = hexRGBA(color, alpha)
        ctx.fillRect(xLeft, rectY, rectW, rectH)

        // Border
        const bw = zone.touchCount >= 5 ? 2.5 : zone.touchCount >= 4 ? 2 : zone.touchCount >= 3 ? 1.5 : 1
        ctx.strokeStyle = hexRGBA(color, Math.min(0.9, alpha + 0.2))
        ctx.lineWidth = bw
        ctx.setLineDash([6, 3])
        ctx.strokeRect(xLeft, rectY, rectW, rectH)
        ctx.setLineDash([])

        // Glow if price inside
        if (currentPrice >= zone.bottom && currentPrice <= zone.top) {
          const g = ctx.createLinearGradient(0, rectY, 0, rectY + rectH)
          g.addColorStop(0, hexRGBA(color, 0.12))
          g.addColorStop(0.5, hexRGBA(color, 0.22))
          g.addColorStop(1, hexRGBA(color, 0.12))
          ctx.fillStyle = g
          ctx.fillRect(xLeft, rectY, rectW, rectH)
        }

        // Label badge
        const strengthTag = zone.touchCount >= 5 ? 'STRONG ' : ''
        const typeChar = isResistance ? 'R' : 'S'
        const label = `${zone.tfLabel} ${typeChar} ${strengthTag}(${zone.touchCount}×)`
        ctx.font = '600 10px Inter, sans-serif'
        const tw = ctx.measureText(label).width
        const lx = xLeft + 6
        const ly = isResistance ? rectY + 4 : rectY + rectH - 20
        const lw = tw + 10, lh = 16

        ctx.fillStyle = hexRGBA(color, 0.85)
        ctx.beginPath()
        ctx.roundRect?.(lx, ly, lw, lh, 3) ?? ctx.rect(lx, ly, lw, lh)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'left'
        ctx.fillText(label, lx + 5, ly + lh / 2)

        // Price tag at right edge
        const priceTag = (isResistance ? zone.top : zone.bottom).toFixed(precision)
        ctx.font = '500 9px Inter, sans-serif'
        const ptw = ctx.measureText(priceTag).width + 8
        const ptx = chartW - ptw - 2
        const pty = isResistance ? rectY - 7 : rectY + rectH - 7

        ctx.fillStyle = hexRGBA(color, 0.8)
        ctx.beginPath()
        ctx.roundRect?.(ptx, pty, ptw, 14, 2) ?? ctx.rect(ptx, pty, ptw, 14)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.fillText(priceTag, ptx + ptw / 2, pty + 7)
        ctx.textAlign = 'left'
      }
    }

    drawSet(resistance, true)
    drawSet(support, false)
    ctx.restore()
    return true
  },

  createTooltipDataSource: ({ indicator, crosshair, defaultStyles }: any) => {
    const icons: any[] = []
    const di = defaultStyles?.tooltip?.icons
    if (di) {
      if (indicator.visible) { icons.push(di[1]); icons.push(di[2]); icons.push(di[3]) }
      else { icons.push(di[0]); icons.push(di[2]); icons.push(di[3]) }
    }
    const { resistance, support } = _cachedResult
    const sC = support.length, rC = resistance.length
    if (sC === 0 && rC === 0) return { name: 'MTF S/R', calcParamsText: '', icons, values: [] }

    const modeText = indicator.calcParams[9] === 0 ? 'Synth' : 'API'
    const values: any[] = []

    const dataList = (window as any)?._klineChartInstance?.getDataList?.() ?? []
    const cp = dataList[crosshair?.dataIndex ?? 0]?.close ?? 0

    const all = [...resistance, ...support].sort((a, b) => {
      return Math.min(Math.abs(cp - a.top), Math.abs(cp - a.bottom)) - Math.min(Math.abs(cp - b.top), Math.abs(cp - b.bottom))
    }).slice(0, 4)

    for (const z of all) {
      const inside = cp >= z.bottom && cp <= z.top
      const icon = z.type === 'SUPPORT' ? '▲' : '▼'
      values.push({
        title: '',
        value: {
          text: `${icon} ${z.tfLabel} ${z.type === 'SUPPORT' ? 'S' : 'R'} (${z.touchCount}×) ${z.bottom.toFixed(4)}-${z.top.toFixed(4)}${inside ? ' ◉' : ''}`,
          color: z.tfColor
        }
      })
    }

    return { name: 'MTF S/R', calcParamsText: `(${sC}S ${rC}R, ${modeText})`, icons, values }
  }
}

export default mtfsr
