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
 * Price Label overlay.
 * Places a styled price tag at a horizontal line on the chart.
 * Extends full width. Uses extendData for custom label and color.
 *
 * extendData: { text?: string, color?: string, bgColor?: string }
 */
const priceLabel: OverlayTemplate = {
  name: 'priceLabel',
  totalStep: 2,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, overlay, bounding }) => {
    if (coordinates.length < 1) return []

    const points = overlay.points
    const price = points?.[0]?.value ?? 0
    const y = coordinates[0].y

    const ext = overlay.extendData as { text?: string, color?: string, bgColor?: string } | undefined
    const text = ext?.text ?? price.toFixed(2)
    const color = ext?.color ?? '#1677FF'
    const bgColor = ext?.bgColor ?? 'rgba(22, 119, 255, 0.08)'

    const labelWidth = text.length * 7 + 16
    const labelX = bounding.width - labelWidth - 8

    return [
      // Full-width horizontal line
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: 0, y },
            { x: bounding.width, y }
          ]
        },
        styles: { color, size: 1, style: 'dashed' }
      },
      // Label background
      {
        type: 'polygon',
        ignoreEvent: true,
        attrs: {
          coordinates: [
            { x: labelX, y: y - 10 },
            { x: labelX + labelWidth, y: y - 10 },
            { x: labelX + labelWidth, y: y + 10 },
            { x: labelX, y: y + 10 }
          ]
        },
        styles: { style: 'fill', color: bgColor }
      },
      // Label border
      {
        type: 'polygon',
        ignoreEvent: true,
        attrs: {
          coordinates: [
            { x: labelX, y: y - 10 },
            { x: labelX + labelWidth, y: y - 10 },
            { x: labelX + labelWidth, y: y + 10 },
            { x: labelX, y: y + 10 }
          ]
        },
        styles: { style: 'stroke', color }
      },
      // Label text
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: labelX + 8,
          y: y + 4,
          text
        },
        styles: { color, size: 11 }
      }
    ]
  }
}

export default priceLabel
