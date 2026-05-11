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
 * Long Position overlay — TradingView style.
 * User places two points: Entry (point 0) and Target/Stop (point 1).
 * Draws entry line, take profit zone (green), stop loss zone (red),
 * and labels showing the risk/reward ratio.
 */
const longPosition: OverlayTemplate = {
  name: 'longPosition',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, overlay }) => {
    if (coordinates.length < 2) return []

    const points = overlay.points
    if (!points || points.length < 2) return []

    const entryPrice = points[0].value ?? 0
    const targetPrice = points[1].value ?? 0

    // For long: TP is above entry, SL is below (mirrored distance)
    const diff = Math.abs(targetPrice - entryPrice)
    const isTargetAbove = targetPrice > entryPrice

    const tpY = isTargetAbove ? coordinates[1].y : coordinates[0].y - (coordinates[1].y - coordinates[0].y)
    const slY = isTargetAbove ? coordinates[0].y + (coordinates[0].y - coordinates[1].y) : coordinates[1].y

    const entryY = coordinates[0].y
    const left = Math.min(coordinates[0].x, coordinates[1].x)
    const right = Math.max(coordinates[0].x, coordinates[1].x)
    const width = Math.max(right - left, 120)

    const rr = diff > 0 ? 1 : 0

    return [
      // Entry line
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: left, y: entryY },
            { x: left + width, y: entryY }
          ]
        },
        styles: { color: '#2196F3', size: 2 }
      },
      // Take Profit zone (green)
      {
        type: 'polygon',
        ignoreEvent: true,
        attrs: {
          coordinates: [
            { x: left, y: entryY },
            { x: left + width, y: entryY },
            { x: left + width, y: tpY },
            { x: left, y: tpY }
          ]
        },
        styles: { style: 'fill', color: 'rgba(38, 166, 91, 0.2)' }
      },
      // Take Profit border
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: left, y: tpY },
            { x: left + width, y: tpY }
          ]
        },
        styles: { color: '#26A65B', size: 1, style: 'dashed' }
      },
      // Stop Loss zone (red)
      {
        type: 'polygon',
        ignoreEvent: true,
        attrs: {
          coordinates: [
            { x: left, y: entryY },
            { x: left + width, y: entryY },
            { x: left + width, y: slY },
            { x: left, y: slY }
          ]
        },
        styles: { style: 'fill', color: 'rgba(239, 83, 80, 0.2)' }
      },
      // Stop Loss border
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: left, y: slY },
            { x: left + width, y: slY }
          ]
        },
        styles: { color: '#EF5350', size: 1, style: 'dashed' }
      },
      // Labels
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: left + 4,
          y: entryY - 4,
          text: `LONG Entry: ${entryPrice.toFixed(2)}`
        },
        styles: { color: '#2196F3', size: 11 }
      },
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: left + 4,
          y: tpY + 14,
          text: `TP: ${(isTargetAbove ? targetPrice : entryPrice + diff).toFixed(2)} (R:R 1:${rr.toFixed(1)})`
        },
        styles: { color: '#26A65B', size: 11 }
      },
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: left + 4,
          y: slY - 4,
          text: `SL: ${(isTargetAbove ? entryPrice - diff : targetPrice).toFixed(2)}`
        },
        styles: { color: '#EF5350', size: 11 }
      }
    ]
  }
}

export default longPosition
