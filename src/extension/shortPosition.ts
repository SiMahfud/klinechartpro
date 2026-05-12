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
 * Short Position overlay — TradingView style.
 * 3 clicks: Entry, TP, SL. Gradient fills, pips calculation, R:R summary.
 */
const shortPosition: OverlayTemplate = {
  name: 'shortPosition',
  totalStep: 4, // 4 = 3 clicks (Entry, TP, SL)
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: true,

  createPointFigures: ({ overlay, coordinates }) => {
    const n = coordinates.length
    if (n === 0) return []

    const entryY = coordinates[0].y
    const entryX = coordinates[0].x
    const left = entryX

    let right = entryX + 150
    if (n > 1) {
      right = Math.max(entryX + 20, coordinates[1].x)
    }

    const figures: any[] = []
    const entryPrice = overlay.points[0]?.value
    const precision = (() => {
      const str = entryPrice?.toString() || ''
      const decPart = str.split('.')[1] || ''
      return Math.min(5, Math.max(2, decPart.length))
    })()
    const pipFactor = precision >= 4 ? Math.pow(10, precision - 1) : 100

    // Entry line
    figures.push({
      type: 'line',
      attrs: { coordinates: [{ x: left, y: entryY }, { x: right, y: entryY }] },
      styles: { color: '#e040fb', size: 2 }
    })
    if (entryPrice !== undefined) {
      figures.push({
        type: 'text',
        attrs: { x: left + 10, y: entryY + 4, text: `SHORT  Entry ${entryPrice.toFixed(precision)}` },
        styles: {
          color: '#ffffff', size: 11, family: 'Inter, sans-serif', weight: '700',
          backgroundColor: 'rgba(224, 64, 251, 0.85)', paddingLeft: 6, paddingRight: 6,
          paddingTop: 3, paddingBottom: 3, borderRadius: 3
        }
      })
    }

    if (n === 1) return figures

    // TP Zone (below for short)
    if (n >= 2) {
      const tpY = coordinates[1].y
      const tpPrice = overlay.points[1]?.value

      figures.push({
        type: 'polygon',
        attrs: {
          coordinates: [
            { x: left, y: entryY }, { x: right, y: entryY },
            { x: right, y: tpY }, { x: left, y: tpY }
          ]
        },
        styles: { style: 'fill', color: 'rgba(8, 153, 129, 0.15)' }
      })
      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: left, y: tpY }, { x: right, y: tpY }] },
        styles: { color: '#089981', size: 1.5, style: 'dashed', dashedValue: [5, 3] }
      })

      if (tpPrice !== undefined && entryPrice !== undefined) {
        const rawTpPips = (entryPrice - tpPrice) * pipFactor
        const tpPips = Math.abs(rawTpPips)
        const tpPct = Math.abs((entryPrice - tpPrice) / entryPrice * 100)
        const tpSign = rawTpPips >= 0 ? '+' : '-'
        const tpMidY = (entryY + tpY) / 2

        figures.push({
          type: 'text',
          attrs: { x: left + 10, y: tpY + 4, text: `TP ${tpPrice.toFixed(precision)}` },
          styles: {
            color: '#ffffff', size: 11, family: 'Inter, sans-serif', weight: '700',
            backgroundColor: 'rgba(8, 153, 129, 0.85)', paddingLeft: 6, paddingRight: 6,
            paddingTop: 3, paddingBottom: 3, borderRadius: 3
          }
        })
        figures.push({
          type: 'text',
          ignoreEvent: true,
          attrs: { x: left + 10, y: tpMidY - 6, text: `${tpSign}${tpPips.toFixed(1)} pips (${tpSign}${tpPct.toFixed(2)}%)` },
          styles: { color: '#ffffff', size: 12, family: 'Inter, sans-serif', weight: '600' }
        })
      }
    }

    // SL Zone (above for short)
    if (n >= 3) {
      const slY = coordinates[2].y
      const slPrice = overlay.points[2]?.value

      figures.push({
        type: 'polygon',
        attrs: {
          coordinates: [
            { x: left, y: entryY }, { x: right, y: entryY },
            { x: right, y: slY }, { x: left, y: slY }
          ]
        },
        styles: { style: 'fill', color: 'rgba(242, 54, 69, 0.15)' }
      })
      figures.push({
        type: 'line',
        attrs: { coordinates: [{ x: left, y: slY }, { x: right, y: slY }] },
        styles: { color: '#f23645', size: 1.5, style: 'dashed', dashedValue: [5, 3] }
      })

      if (slPrice !== undefined && entryPrice !== undefined) {
        const rawSlPips = (entryPrice - slPrice) * pipFactor
        const slPips = Math.abs(rawSlPips)
        const slPct = Math.abs((entryPrice - slPrice) / entryPrice * 100)
        const slSign = rawSlPips >= 0 ? '+' : '-'
        const slMidY = (entryY + slY) / 2

        figures.push({
          type: 'text',
          attrs: { x: left + 10, y: slY + 4, text: `SL ${slPrice.toFixed(precision)}` },
          styles: {
            color: '#ffffff', size: 11, family: 'Inter, sans-serif', weight: '700',
            backgroundColor: 'rgba(242, 54, 69, 0.85)', paddingLeft: 6, paddingRight: 6,
            paddingTop: 3, paddingBottom: 3, borderRadius: 3
          }
        })
        figures.push({
          type: 'text',
          ignoreEvent: true,
          attrs: { x: left + 10, y: slMidY - 6, text: `${slSign}${slPips.toFixed(1)} pips (${slSign}${slPct.toFixed(2)}%)` },
          styles: { color: '#ffffff', size: 12, family: 'Inter, sans-serif', weight: '600' }
        })

        // R:R Summary Box at bottom-right (for short)
        if (overlay.points[1]?.value !== undefined) {
          const tpPrice = overlay.points[1].value
          const risk = Math.abs(slPrice - entryPrice)
          const reward = Math.abs(entryPrice - tpPrice)
          const rr = risk > 0 ? (reward / risk).toFixed(2) : '∞'

          const rawTpPips = (entryPrice - tpPrice) * pipFactor
          const tpPipsText = Math.abs(rawTpPips).toFixed(1)

          const textInfo = `R:R 1:${rr}  |  Risk: ${slPips.toFixed(1)}p  |  Reward: ${tpPipsText}p`

          figures.push({
            type: 'text',
            ignoreEvent: true,
            attrs: { x: right - 8, y: Math.max(entryY, coordinates[1].y) + 10, text: textInfo, align: 'right', baseline: 'top' },
            styles: {
              color: '#ffffff', size: 11, family: 'Inter, sans-serif', weight: '700',
              backgroundColor: 'rgba(224, 64, 251, 0.90)', paddingLeft: 8, paddingRight: 8,
              paddingTop: 4, paddingBottom: 4, borderRadius: 3
            }
          })
        }
      }
    }

    return figures
  },

  performEventMoveForDrawing: ({ currentStep, points, performPoint }: any) => {
    if (currentStep === 2) {
      if (points[1]) {
        points[1].dataIndex = performPoint.dataIndex
        if (performPoint.timestamp) points[1].timestamp = performPoint.timestamp
        points[1].value = performPoint.value
      }
    } else if (currentStep === 3) {
      if (points[2]) {
        if (points[1]) {
          points[2].dataIndex = points[1].dataIndex
          if (points[1].timestamp) points[2].timestamp = points[1].timestamp
        }
        points[2].value = performPoint.value
      }
    }
  },

  performEventPressedMove: ({ points, performPointIndex, performPoint }: any) => {
    if (performPointIndex === 1 || performPointIndex === 2) {
      if (points[performPointIndex]) {
        points[performPointIndex].value = performPoint.value
      }
      if (points[1]) {
        points[1].dataIndex = performPoint.dataIndex
        if (performPoint.timestamp) points[1].timestamp = performPoint.timestamp
      }
      if (points[2]) {
        points[2].dataIndex = performPoint.dataIndex
        if (performPoint.timestamp) points[2].timestamp = performPoint.timestamp
      }
    } else if (performPointIndex === 0 && points[0]) {
      const diffVal = performPoint.value - points[0].value
      const diffIndex = performPoint.dataIndex - (points[0].dataIndex || 0)
      const diffTime = (performPoint.timestamp || 0) - (points[0].timestamp || 0)

      points[0].value = performPoint.value
      points[0].dataIndex = performPoint.dataIndex
      if (performPoint.timestamp) points[0].timestamp = performPoint.timestamp

      if (points[1]) {
        points[1].value += diffVal
        if (points[1].dataIndex !== undefined) points[1].dataIndex += diffIndex
        if (points[1].timestamp !== undefined) points[1].timestamp += diffTime
      }
      if (points[2]) {
        points[2].value += diffVal
        if (points[2].dataIndex !== undefined) points[2].dataIndex += diffIndex
        if (points[2].timestamp !== undefined) points[2].timestamp += diffTime
      }
    }
  }
}

export default shortPosition
