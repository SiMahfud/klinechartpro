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

import type { Chart } from 'klinecharts'

/**
 * Crosshair sync manager.
 * Links multiple Chart instances so that crosshair movement on one
 * chart broadcasts the timestamp to all others.
 */
export class CrosshairSyncManager {
  private _charts: Chart[] = []
  private _isSyncing = false

  /** Add a chart to the sync group */
  addChart (chart: Chart): void {
    if (this._charts.includes(chart)) return
    this._charts.push(chart)

    // Subscribe to crosshair changes on this chart
    chart.subscribeAction('onCrosshairChange' as any, (data: any) => {
      if (this._isSyncing) return
      this._isSyncing = true

      try {
        const { x, y, kLineData } = data || {}
        const timestamp = kLineData?.timestamp

        // Broadcast to all other charts
        for (const otherChart of this._charts) {
          if (otherChart === chart) continue
          try {
            // Move crosshair on other charts to the same timestamp
            otherChart.executeCrosshairChange?.({
              x,
              y,
              timestamp
            } as any)
          } catch {
            // Some klinecharts versions may not support this
          }
        }
      } finally {
        this._isSyncing = false
      }
    })
  }

  /** Remove a chart from the sync group */
  removeChart (chart: Chart): void {
    const idx = this._charts.indexOf(chart)
    if (idx >= 0) {
      this._charts.splice(idx, 1)
      try {
        chart.unsubscribeAction('onCrosshairChange' as any)
      } catch {
        // ignore
      }
    }
  }

  /** Get number of linked charts */
  getChartCount (): number {
    return this._charts.length
  }

  /** Clean up all subscriptions */
  destroy (): void {
    for (const chart of this._charts) {
      try {
        chart.unsubscribeAction('onCrosshairChange' as any)
      } catch {
        // ignore
      }
    }
    this._charts = []
  }
}
