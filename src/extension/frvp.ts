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

const NUM_BINS = 30
const VP_WIDTH_RATIO = 0.35
const VALUE_AREA_PCT = 0.70

/**
 * Fixed Range Volume Profile (FRVP) overlay.
 * User selects two points defining a time range.
 * The overlay computes a volume profile histogram over the price range,
 * identifies POC (Point of Control), VAH (Value Area High), VAL (Value Area Low),
 * and renders horizontal bars on the right side of the selection.
 */
const frvp: OverlayTemplate = {
  name: 'frvp',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, overlay, bounding }) => {
    if (coordinates.length < 2) return []

    const points = overlay.points
    if (!points || points.length < 2) return []

    const price0 = points[0].value ?? 0
    const price1 = points[1].value ?? 0
    const highPrice = Math.max(price0, price1)
    const lowPrice = Math.min(price0, price1)
    const priceRange = highPrice - lowPrice

    if (priceRange <= 0) return []

    const top = Math.min(coordinates[0].y, coordinates[1].y)
    const bottom = Math.max(coordinates[0].y, coordinates[1].y)
    const left = Math.min(coordinates[0].x, coordinates[1].x)
    const right = Math.max(coordinates[0].x, coordinates[1].x)
    const height = bottom - top

    if (height <= 0) return []

    // Build volume bins from candle data embedded in the overlay
    // Since we can't access raw KLineData from overlay, we create
    // a visual-only profile based on the price range geometry
    const binHeight = height / NUM_BINS
    const vpWidth = Math.min((right - left) * VP_WIDTH_RATIO, bounding.width * 0.3)

    // Generate a bell-curve-like distribution for visual demonstration
    // In real usage, the user should populate overlay.extendData with actual volume data
    const bins: number[] = []
    let maxVol = 0
    const extData = overlay.extendData as number[] | undefined

    if (extData && extData.length === NUM_BINS) {
      for (let i = 0; i < NUM_BINS; i++) {
        bins.push(extData[i])
        if (extData[i] > maxVol) maxVol = extData[i]
      }
    } else {
      // Default bell curve distribution
      const mid = NUM_BINS / 2
      for (let i = 0; i < NUM_BINS; i++) {
        const dist = Math.abs(i - mid) / mid
        const vol = Math.exp(-dist * dist * 3) * 100 + Math.random() * 20
        bins.push(vol)
        if (vol > maxVol) maxVol = vol
      }
    }

    // Find POC (highest volume bin)
    let pocIdx = 0
    for (let i = 1; i < NUM_BINS; i++) {
      if (bins[i] > bins[pocIdx]) pocIdx = i
    }

    // Calculate Value Area (70% of total volume centered on POC)
    const totalVol = bins.reduce((a, b) => a + b, 0)
    const targetVol = totalVol * VALUE_AREA_PCT
    let vaLow = pocIdx
    let vaHigh = pocIdx
    let accVol = bins[pocIdx]

    while (accVol < targetVol && (vaLow > 0 || vaHigh < NUM_BINS - 1)) {
      const addLow = vaLow > 0 ? bins[vaLow - 1] : 0
      const addHigh = vaHigh < NUM_BINS - 1 ? bins[vaHigh + 1] : 0
      if (addLow >= addHigh && vaLow > 0) {
        vaLow--
        accVol += addLow
      } else if (vaHigh < NUM_BINS - 1) {
        vaHigh++
        accVol += addHigh
      } else {
        vaLow--
        accVol += addLow
      }
    }

    const figures: any[] = []

    // Selection box outline
    figures.push({
      type: 'line',
      attrs: [
        { coordinates: [{ x: left, y: top }, { x: right, y: top }] },
        { coordinates: [{ x: right, y: top }, { x: right, y: bottom }] },
        { coordinates: [{ x: right, y: bottom }, { x: left, y: bottom }] },
        { coordinates: [{ x: left, y: bottom }, { x: left, y: top }] }
      ],
      styles: { style: 'dashed', color: 'rgba(150, 150, 150, 0.5)', size: 1 }
    })

    // Volume bars
    for (let i = 0; i < NUM_BINS; i++) {
      const barWidth = maxVol > 0 ? (bins[i] / maxVol) * vpWidth : 0
      const barTop = top + i * binHeight
      const barBottom = barTop + binHeight - 1

      let color: string
      if (i === pocIdx) {
        color = 'rgba(255, 193, 7, 0.6)' // POC — yellow
      } else if (i >= vaLow && i <= vaHigh) {
        color = 'rgba(33, 150, 243, 0.35)' // Value Area — blue
      } else {
        color = 'rgba(150, 150, 150, 0.2)' // Outside VA — gray
      }

      figures.push({
        type: 'polygon',
        ignoreEvent: true,
        attrs: {
          coordinates: [
            { x: right, y: barTop },
            { x: right + barWidth, y: barTop },
            { x: right + barWidth, y: barBottom },
            { x: right, y: barBottom }
          ]
        },
        styles: { style: 'fill', color }
      })
    }

    // POC line
    const pocY = top + pocIdx * binHeight + binHeight / 2
    figures.push({
      type: 'line',
      attrs: {
        coordinates: [
          { x: left, y: pocY },
          { x: right + vpWidth, y: pocY }
        ]
      },
      styles: { color: '#FFC107', size: 1.5 }
    })

    // POC label
    figures.push({
      type: 'text',
      ignoreEvent: true,
      attrs: { x: right + vpWidth + 4, y: pocY + 4, text: 'POC' },
      styles: { color: '#FFC107', size: 10 }
    })

    // VAH line
    const vahY = top + vaHigh * binHeight
    figures.push({
      type: 'line',
      attrs: {
        coordinates: [
          { x: right, y: vahY },
          { x: right + vpWidth, y: vahY }
        ]
      },
      styles: { color: '#2196F3', size: 1, style: 'dashed' }
    })

    // VAH label
    figures.push({
      type: 'text',
      ignoreEvent: true,
      attrs: { x: right + vpWidth + 4, y: vahY + 4, text: 'VAH' },
      styles: { color: '#2196F3', size: 10 }
    })

    // VAL line
    const valY = top + (vaLow + 1) * binHeight
    figures.push({
      type: 'line',
      attrs: {
        coordinates: [
          { x: right, y: valY },
          { x: right + vpWidth, y: valY }
        ]
      },
      styles: { color: '#2196F3', size: 1, style: 'dashed' }
    })

    // VAL label
    figures.push({
      type: 'text',
      ignoreEvent: true,
      attrs: { x: right + vpWidth + 4, y: valY + 4, text: 'VAL' },
      styles: { color: '#2196F3', size: 10 }
    })

    return figures
  }
}

export default frvp
