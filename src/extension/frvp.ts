/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OverlayTemplate } from 'klinecharts'

/**
 * Fixed Range Volume Profile (FRVP) overlay.
 * 2 clicks to define a time range.
 * Computes volume profile from actual chart data with POC, VAH, VAL,
 * HVN/LVN detection, and reaction labeling.
 */
const frvp: OverlayTemplate = {
  name: 'frvp',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: false,
  styles: {
    rect: { color: 'rgba(41, 98, 255, 0.25)' }
  } as any,

  createPointFigures: ({ overlay, coordinates, bounding, xAxis, yAxis }: any) => {
    const points = overlay.points
    if (coordinates.length < 2 || !points || points.length < 2) return []
    if (points[0].dataIndex === undefined || points[1].dataIndex === undefined) return []

    const idx1 = Math.min(points[0].dataIndex, points[1].dataIndex)
    const idx2 = Math.max(points[0].dataIndex, points[1].dataIndex)

    // Try to get chart instance for data access
    const chart = (overlay as any)._bindingChart || (window as any)._klineChartInstance
    if (!chart) return []

    const dataList = chart.getDataList()
    if (!dataList || dataList.length === 0) return []

    const startIdx = Math.max(0, idx1)
    const endIdx = Math.min(dataList.length - 1, idx2)
    if (startIdx >= endIdx) return []

    let rangeHigh = -Infinity
    let rangeLow = Infinity
    let totalVolume = 0

    for (let i = startIdx; i <= endIdx; i++) {
      const bar = dataList[i]
      if (bar.high > rangeHigh) rangeHigh = bar.high
      if (bar.low < rangeLow) rangeLow = bar.low
      totalVolume += (bar.volume || 0)
    }

    if (rangeHigh <= rangeLow || totalVolume === 0) return []

    const NUM_BUCKETS = 40
    const bucketSize = (rangeHigh - rangeLow) / NUM_BUCKETS
    const buckets = new Array(NUM_BUCKETS).fill(0)

    for (let i = startIdx; i <= endIdx; i++) {
      const bar = dataList[i]
      const vol = bar.volume || 0
      if (vol === 0) continue

      const barBucketLow = Math.floor((bar.low - rangeLow) / bucketSize)
      const barBucketHigh = Math.floor((bar.high - rangeLow) / bucketSize)
      const span = Math.max(1, barBucketHigh - barBucketLow + 1)
      const volPerBucket = vol / span

      for (let b = Math.max(0, barBucketLow); b <= Math.min(NUM_BUCKETS - 1, barBucketHigh); b++) {
        buckets[b] += volPerBucket
      }
    }

    let maxVol = 0
    let pocIndex = 0
    for (let b = 0; b < NUM_BUCKETS; b++) {
      if (buckets[b] > maxVol) {
        maxVol = buckets[b]
        pocIndex = b
      }
    }

    const vaThreshold = totalVolume * 0.70
    let vaVolume = buckets[pocIndex]
    let vaLow = pocIndex
    let vaHigh = pocIndex
    while (vaVolume < vaThreshold && (vaLow > 0 || vaHigh < NUM_BUCKETS - 1)) {
      const expandLow = vaLow > 0 ? buckets[vaLow - 1] : 0
      const expandHigh = vaHigh < NUM_BUCKETS - 1 ? buckets[vaHigh + 1] : 0
      if (expandLow >= expandHigh && vaLow > 0) {
        vaLow--
        vaVolume += buckets[vaLow]
      } else if (vaHigh < NUM_BUCKETS - 1) {
        vaHigh++
        vaVolume += buckets[vaHigh]
      } else {
        vaLow--
        vaVolume += buckets[vaLow]
      }
    }

    const x1 = Math.min(coordinates[0].x, coordinates[1].x)
    const x2 = Math.max(coordinates[0].x, coordinates[1].x)
    const rangeWidth = x2 - x1
    const maxBarWidth = rangeWidth * 0.4
    const figures: any[] = []

    // HVN and LVN detection
    const hvnThreshold = maxVol * 0.80
    const lvnThreshold = maxVol * 0.15
    const lvnNeighborMin = maxVol * 0.30
    const hvnBuckets: number[] = []
    const lvnBuckets: number[] = []

    const keyBuckets = new Set([pocIndex, vaHigh, vaLow])
    const isNearKey = (b: number) => {
      for (const kb of keyBuckets) {
        if (Math.abs(b - kb) <= 2) return true
      }
      return false
    }

    for (let b = 0; b < NUM_BUCKETS; b++) {
      if (buckets[b] >= hvnThreshold && b !== pocIndex && !isNearKey(b)) {
        hvnBuckets.push(b)
      }
    }

    for (let b = 1; b < NUM_BUCKETS - 1; b++) {
      if (isNearKey(b)) continue
      if (buckets[b] < lvnThreshold &&
        buckets[b] < buckets[b - 1] &&
        buckets[b] < buckets[b + 1] &&
        buckets[b - 1] > lvnNeighborMin &&
        buckets[b + 1] > lvnNeighborMin) {
        lvnBuckets.push(b)
      }
    }

    hvnBuckets.sort((a, b2) => buckets[b2] - buckets[a])
    hvnBuckets.splice(3)
    lvnBuckets.sort((a, b2) => buckets[a] - buckets[b2])
    lvnBuckets.splice(3)

    // Draw volume histogram bars
    for (let b = 0; b < NUM_BUCKETS; b++) {
      if (buckets[b] === 0) continue

      const priceLow = rangeLow + b * bucketSize
      const priceHigh = rangeLow + (b + 1) * bucketSize
      const yTop = yAxis.convertToPixel(priceHigh)
      const yBottom = yAxis.convertToPixel(priceLow)
      const barWidth = (buckets[b] / maxVol) * maxBarWidth
      const isValueArea = b >= vaLow && b <= vaHigh
      const isPOC = b === pocIndex
      const isHVN = hvnBuckets.includes(b)

      let fillColor: string
      if (isPOC) fillColor = 'rgba(255, 235, 59, 0.55)'
      else if (isHVN) fillColor = 'rgba(255, 152, 0, 0.40)'
      else if (isValueArea) fillColor = 'rgba(41, 98, 255, 0.35)'
      else fillColor = 'rgba(120, 123, 134, 0.20)'

      figures.push({
        type: 'rect',
        attrs: {
          x: x1,
          y: Math.min(yTop, yBottom),
          width: barWidth,
          height: Math.abs(yBottom - yTop) - 1
        },
        styles: {
          style: 'fill',
          color: fillColor,
          borderColor: isPOC ? 'rgba(255, 235, 59, 0.8)' : 'transparent',
          borderSize: isPOC ? 1 : 0
        }
      })
    }

    // Label measurement helper
    const measureText = (text: string, size: number) => {
      return text.length * size * 0.58
    }

    // POC, VAH, VAL Labels with anti-overlap
    const pocPrice = rangeLow + (pocIndex + 0.5) * bucketSize
    const pocY = yAxis.convertToPixel(pocPrice)
    const pocText = `POC ${pocPrice.toFixed(5)}`
    const pocLabelW = measureText(pocText, 10) + 10

    const vaHighPrice = rangeLow + (vaHigh + 1) * bucketSize
    const vaLowPrice = rangeLow + vaLow * bucketSize
    const vaHighY = yAxis.convertToPixel(vaHighPrice)
    const vaLowY = yAxis.convertToPixel(vaLowPrice)

    const vahText = `VAH ${vaHighPrice.toFixed(5)}`
    const vahLabelW = measureText(vahText, 10) + 10
    const valText = `VAL ${vaLowPrice.toFixed(5)}`
    const valLabelW = measureText(valText, 10) + 10

    // Anti-overlap logic
    const labelEntries = [
      { id: 'vah', y: vaHighY, text: vahText, w: vahLabelW, bg: 'rgba(41, 98, 255, 0.85)', fg: '#ffffff', weight: '600', size: 10 },
      { id: 'poc', y: pocY, text: pocText, w: pocLabelW, bg: '#ffeb3b', fg: '#000000', weight: '700', size: 10 },
      { id: 'val', y: vaLowY, text: valText, w: valLabelW, bg: 'rgba(41, 98, 255, 0.85)', fg: '#ffffff', weight: '600', size: 10 }
    ]
    labelEntries.sort((a, b) => a.y - b.y)
    const minLabelSpacing = 16
    for (let li = 1; li < labelEntries.length; li++) {
      if (labelEntries[li].y - labelEntries[li - 1].y < minLabelSpacing) {
        labelEntries[li].y = labelEntries[li - 1].y + minLabelSpacing
      }
    }

    // POC Line
    figures.push({
      type: 'line',
      attrs: { coordinates: [{ x: x1, y: pocY }, { x: x2, y: pocY }] },
      styles: { style: 'dashed', color: 'rgba(255, 235, 59, 0.9)', size: 1.5, dashedValue: [6, 3] }
    })

    // VAH Line
    figures.push({
      type: 'line',
      attrs: { coordinates: [{ x: x1, y: vaHighY }, { x: x2, y: vaHighY }] },
      styles: { style: 'dashed', color: 'rgba(41, 98, 255, 0.8)', size: 1.5, dashedValue: [5, 3] }
    })

    // VAL Line
    figures.push({
      type: 'line',
      attrs: { coordinates: [{ x: x1, y: vaLowY }, { x: x2, y: vaLowY }] },
      styles: { style: 'dashed', color: 'rgba(41, 98, 255, 0.8)', size: 1.5, dashedValue: [5, 3] }
    })

    // Draw labels
    for (const lbl of labelEntries) {
      figures.push({
        type: 'text',
        attrs: { x: x1 - lbl.w - 6, y: lbl.y, text: lbl.text },
        styles: {
          color: lbl.fg, size: lbl.size, family: 'Inter, sans-serif', weight: lbl.weight,
          backgroundColor: lbl.bg, paddingLeft: 4, paddingRight: 4,
          paddingTop: 2, paddingBottom: 2, borderRadius: 2
        }
      })
    }

    // HVN Labels
    for (const b of hvnBuckets) {
      const hvnPrice = rangeLow + (b + 0.5) * bucketSize
      const hvnY = yAxis.convertToPixel(hvnPrice)
      const barEndX = x1 + (buckets[b] / maxVol) * maxBarWidth

      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: x1, y: hvnY }, { x: barEndX, y: hvnY }] },
        styles: { style: 'dashed', color: 'rgba(255, 152, 0, 0.5)', size: 1, dashedValue: [2, 2] }
      })
      figures.push({
        type: 'text',
        attrs: { x: barEndX + 3, y: hvnY, text: 'HVN' },
        styles: {
          color: '#ffffff', size: 9, family: 'Inter, sans-serif', weight: '600',
          backgroundColor: 'rgba(255, 152, 0, 0.75)', paddingLeft: 3, paddingRight: 3,
          paddingTop: 1, paddingBottom: 1, borderRadius: 2
        }
      })
    }

    // LVN Labels
    for (const b of lvnBuckets) {
      const lvnPrice = rangeLow + (b + 0.5) * bucketSize
      const lvnY = yAxis.convertToPixel(lvnPrice)
      const barEndX = x1 + Math.max(4, (buckets[b] / maxVol) * maxBarWidth)

      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: x1, y: lvnY }, { x: x2, y: lvnY }] },
        styles: { style: 'dashed', color: 'rgba(156, 39, 176, 0.35)', size: 1, dashedValue: [2, 4] }
      })
      figures.push({
        type: 'text',
        attrs: { x: barEndX + 3, y: lvnY, text: 'LVN' },
        styles: {
          color: '#ffffff', size: 9, family: 'Inter, sans-serif', weight: '600',
          backgroundColor: 'rgba(156, 39, 176, 0.7)', paddingLeft: 3, paddingRight: 3,
          paddingTop: 1, paddingBottom: 1, borderRadius: 2
        }
      })
    }

    // Range boundary lines
    figures.push({
      type: 'line',
      attrs: { coordinates: [{ x: x1, y: yAxis.convertToPixel(rangeHigh) }, { x: x1, y: yAxis.convertToPixel(rangeLow) }] },
      styles: { color: 'rgba(120, 123, 134, 0.4)', size: 1 }
    })
    figures.push({
      type: 'line',
      attrs: { coordinates: [{ x: x2, y: yAxis.convertToPixel(rangeHigh) }, { x: x2, y: yAxis.convertToPixel(rangeLow) }] },
      styles: { color: 'rgba(120, 123, 134, 0.4)', size: 1 }
    })

    return figures
  }
}

export default frvp
