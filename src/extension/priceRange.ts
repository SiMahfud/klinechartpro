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
 * Price Range (horizontal zone).
 * Draws a shaded horizontal price zone — useful for support/resistance areas.
 */
const priceRange: OverlayTemplate = {
  name: 'priceRange',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding, overlay }) => {
    if (coordinates.length < 2) return []

    const top = Math.min(coordinates[0].y, coordinates[1].y)
    const bottom = Math.max(coordinates[0].y, coordinates[1].y)

    const points = overlay.points
    const highPrice = points ? Math.max(points[0].value ?? 0, points[1].value ?? 0) : 0
    const lowPrice = points ? Math.min(points[0].value ?? 0, points[1].value ?? 0) : 0

    return [
      // Full-width shaded zone
      {
        type: 'polygon',
        ignoreEvent: true,
        attrs: {
          coordinates: [
            { x: 0, y: top },
            { x: bounding.width, y: top },
            { x: bounding.width, y: bottom },
            { x: 0, y: bottom }
          ]
        },
        styles: { style: 'fill', color: 'rgba(33, 150, 243, 0.1)' }
      },
      // Top border
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: 0, y: top },
            { x: bounding.width, y: top }
          ]
        },
        styles: { color: 'rgba(33, 150, 243, 0.5)', size: 1 }
      },
      // Bottom border
      {
        type: 'line',
        attrs: {
          coordinates: [
            { x: 0, y: bottom },
            { x: bounding.width, y: bottom }
          ]
        },
        styles: { color: 'rgba(33, 150, 243, 0.5)', size: 1 }
      },
      // Label
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: 8,
          y: top + 14,
          text: `${highPrice.toFixed(2)} — ${lowPrice.toFixed(2)}`
        },
        styles: { color: '#2196F3', size: 11 }
      }
    ]
  }
}

export default priceRange
