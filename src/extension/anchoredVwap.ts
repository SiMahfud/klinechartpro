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
 * Anchored VWAP overlay.
 * User clicks an anchor point; VWAP is calculated from that candle forward.
 * Uses extendData to receive kline data for VWAP calculation.
 *
 * extendData format: { klineData: KLineData[] }
 * If no extendData provided, draws a simple "VWAP Anchor" marker.
 */
const anchoredVwap: OverlayTemplate = {
  name: 'anchoredVwap',
  totalStep: 2,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, overlay, bounding }) => {
    if (coordinates.length < 1) return []

    const points = overlay.points
    if (!points || points.length < 1) return []

    const anchorX = coordinates[0].x
    const anchorY = coordinates[0].y
    const anchorPrice = points[0].value ?? 0

    const ext = overlay.extendData as { klineData?: Array<{ high: number, low: number, close: number, volume?: number, timestamp: number }> } | undefined
    const klineData = ext?.klineData

    const figures: any[] = []

    // Anchor marker
    figures.push({
      type: 'text',
      ignoreEvent: true,
      attrs: { x: anchorX + 4, y: anchorY - 8, text: '⚓ VWAP' },
      styles: { color: '#FF9800', size: 11 }
    })

    if (klineData && klineData.length > 0) {
      const anchorTs = points[0].timestamp ?? 0
      // Filter data from anchor timestamp forward
      const filtered = klineData.filter(d => d.timestamp >= anchorTs)

      if (filtered.length > 1) {
        let cumVol = 0
        let cumTP = 0
        const vwapPoints: Array<{ x: number, y: number }> = []

        // We need to map timestamps to x coordinates proportionally
        const totalBars = filtered.length
        const availWidth = bounding.width - anchorX
        const barWidth = totalBars > 1 ? availWidth / totalBars : 1

        for (let i = 0; i < filtered.length; i++) {
          const d = filtered[i]
          const tp = (d.high + d.low + d.close) / 3
          const vol = d.volume ?? 1
          cumVol += vol
          cumTP += tp * vol

          const vwap = cumTP / cumVol

          // Map VWAP price to y coordinate (approximate linear interpolation)
          const priceRange = Math.abs((filtered[filtered.length - 1].high) - (filtered[0].low)) || 1
          const midPrice = (filtered[0].low + filtered[filtered.length - 1].high) / 2
          const yRange = bounding.height * 0.6
          const yMid = bounding.height / 2
          const yPos = yMid - ((vwap - midPrice) / priceRange) * yRange

          vwapPoints.push({
            x: anchorX + i * barWidth,
            y: yPos
          })
        }

        // Draw VWAP line segments
        for (let i = 1; i < vwapPoints.length; i++) {
          figures.push({
            type: 'line',
            ignoreEvent: true,
            attrs: {
              coordinates: [vwapPoints[i - 1], vwapPoints[i]]
            },
            styles: { color: '#FF9800', size: 2 }
          })
        }

        // End label
        if (vwapPoints.length > 0) {
          const last = vwapPoints[vwapPoints.length - 1]
          const lastVwap = cumTP / cumVol
          figures.push({
            type: 'text',
            ignoreEvent: true,
            attrs: { x: last.x + 4, y: last.y + 4, text: `VWAP: ${lastVwap.toFixed(2)}` },
            styles: { color: '#FF9800', size: 10 }
          })
        }
      }
    } else {
      // No data: just draw anchor line extending right
      figures.push({
        type: 'line',
        attrs: {
          coordinates: [
            { x: anchorX, y: anchorY },
            { x: bounding.width, y: anchorY }
          ]
        },
        styles: { color: '#FF9800', size: 1.5, style: 'dashed' }
      })
      figures.push({
        type: 'text',
        ignoreEvent: true,
        attrs: { x: bounding.width - 80, y: anchorY - 4, text: `${anchorPrice.toFixed(2)}` },
        styles: { color: '#FF9800', size: 10 }
      })
    }

    return figures
  }
}

export default anchoredVwap
