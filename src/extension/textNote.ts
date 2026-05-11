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
 * Text Note overlay.
 * Places a text annotation at a single point on the chart.
 * Uses extendData.text for the label content, defaults to "Note".
 */
const textNote: OverlayTemplate = {
  name: 'textNote',
  totalStep: 2,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  createPointFigures: ({ coordinates, overlay }) => {
    if (coordinates.length < 1) return []

    const ext = overlay.extendData as { text?: string, color?: string } | undefined
    const text = ext?.text ?? 'Note'
    const color = ext?.color ?? '#FFC107'

    const x = coordinates[0].x
    const y = coordinates[0].y

    return [
      // Background pill
      {
        type: 'polygon',
        ignoreEvent: true,
        attrs: {
          coordinates: [
            { x: x - 4, y: y - 16 },
            { x: x + text.length * 7 + 8, y: y - 16 },
            { x: x + text.length * 7 + 8, y: y + 4 },
            { x: x - 4, y: y + 4 }
          ]
        },
        styles: { style: 'fill', color: 'rgba(0, 0, 0, 0.6)' }
      },
      // Text label
      {
        type: 'text',
        ignoreEvent: true,
        attrs: { x, y, text },
        styles: { color, size: 12 }
      }
    ]
  }
}

export default textNote
