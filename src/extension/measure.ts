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
 * Measure Tool overlay.
 * Shows price difference (absolute + percentage), bar count, and time duration.
 */
const measure: OverlayTemplate = {
  name: 'measure',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, overlay }) => {
    if (coordinates.length < 2) return []

    const points = overlay.points
    if (!points || points.length < 2) return []

    const price0 = points[0].value ?? 0
    const price1 = points[1].value ?? 0
    const priceDiff = price1 - price0
    const pricePct = price0 !== 0 ? ((priceDiff / price0) * 100) : 0

    const time0 = points[0].timestamp ?? 0
    const time1 = points[1].timestamp ?? 0
    const timeDiff = Math.abs(time1 - time0)

    const hours = Math.floor(timeDiff / 3600000)
    const mins = Math.floor((timeDiff % 3600000) / 60000)
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

    const midX = (coordinates[0].x + coordinates[1].x) / 2
    const midY = (coordinates[0].y + coordinates[1].y) / 2

    const isUp = priceDiff >= 0
    const color = isUp ? '#26A65B' : '#EF5350'
    const sign = isUp ? '+' : ''

    return [
      // Connecting line
      {
        type: 'line',
        attrs: {
          coordinates: [coordinates[0], coordinates[1]]
        },
        styles: { color, size: 1, style: 'dashed' }
      },
      // Vertical line from point 0
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: coordinates[0].x, y: coordinates[0].y },
            { x: coordinates[0].x, y: coordinates[1].y }
          ]
        },
        styles: { color: 'rgba(150,150,150,0.4)', size: 1, style: 'dashed' }
      },
      // Horizontal line from point 0
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: coordinates[0].x, y: coordinates[1].y },
            { x: coordinates[1].x, y: coordinates[1].y }
          ]
        },
        styles: { color: 'rgba(150,150,150,0.4)', size: 1, style: 'dashed' }
      },
      // Info label
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: midX + 8,
          y: midY - 8,
          text: `${sign}${priceDiff.toFixed(2)} (${sign}${pricePct.toFixed(2)}%)`
        },
        styles: { color, size: 12 }
      },
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: midX + 8,
          y: midY + 8,
          text: `⏱ ${timeStr}`
        },
        styles: { color: '#999', size: 11 }
      }
    ]
  }
}

export default measure
