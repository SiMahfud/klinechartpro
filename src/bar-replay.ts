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

import type { Chart, KLineData } from 'klinecharts'
import type { Datafeed, SymbolInfo, Period } from './types'

export type ReplayStatus = 'idle' | 'playing' | 'paused' | 'ended'
export type ReplayDataSource = 'current' | 'custom'

export interface ReplayOptions {
  /** Data source: 'current' = use loaded chart data, 'custom' = load from datafeed */
  dataSource: ReplayDataSource
  /** Speed in ms per bar (default 500) */
  speed?: number
  /** Start index (for 'current' source) or start timestamp (for 'custom' source) */
  startFrom?: number
}

export interface ReplayEventHandlers {
  onStep?: (index: number, total: number, bar: KLineData) => void
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
  onStatusChange?: (status: ReplayStatus) => void
}

/**
 * Bar Replay Manager.
 * Allows replaying historical data bar by bar for trading practice.
 * Supports two data sources:
 * - 'current': Uses already-loaded chart data
 * - 'custom': Loads data from datafeed for a specific time range
 */
export class BarReplayManager {
  private _chart: Chart
  private _datafeed: Datafeed | null
  private _fullData: KLineData[] = []
  private _playbackIndex = 0
  private _status: ReplayStatus = 'idle'
  private _speed = 500
  private _timerId: ReturnType<typeof setInterval> | null = null
  private _handlers: ReplayEventHandlers = {}
  private _originalData: KLineData[] | null = null

  constructor (chart: Chart, datafeed?: Datafeed) {
    this._chart = chart
    this._datafeed = datafeed ?? null
  }

  /** Set event handlers */
  setHandlers (handlers: ReplayEventHandlers): void {
    this._handlers = handlers
  }

  /** Start replay with the given options */
  async start (options: ReplayOptions): Promise<void> {
    this._speed = options.speed ?? 500

    if (options.dataSource === 'current') {
      // Use existing chart data
      this._fullData = [...(this._chart.getDataList() as KLineData[])]
    } else if (options.dataSource === 'custom' && this._datafeed) {
      // Load from datafeed — needs symbol & period from caller
      throw new Error('Custom data source requires calling loadData() first')
    }

    if (this._fullData.length === 0) {
      console.warn('[BarReplayManager] No data available for replay')
      return
    }

    // Save original data for restoration
    this._originalData = [...(this._chart.getDataList() as KLineData[])]

    // Set start position
    const startIdx = options.startFrom != null
      ? Math.max(0, Math.min(options.startFrom, this._fullData.length - 1))
      : 0

    this._playbackIndex = startIdx

    // Show only data up to startIdx
    this._applyData()
    this._setStatus('paused')
  }

  /** Load custom data from datafeed for replay */
  async loadData (symbol: SymbolInfo, period: Period, from: number, to: number): Promise<void> {
    if (!this._datafeed) {
      throw new Error('No datafeed provided')
    }
    const data = await this._datafeed.getHistoryKLineData(symbol, period, from, to)
    this._fullData = data ?? []
  }

  /** Play (auto-advance) */
  play (): void {
    if (this._status === 'ended' || this._fullData.length === 0) return

    this._setStatus('playing')
    this._handlers.onPlay?.()

    this._timerId = setInterval(() => {
      this.stepForward()
      if (this._playbackIndex >= this._fullData.length - 1) {
        this.pause()
        this._setStatus('ended')
        this._handlers.onEnd?.()
      }
    }, this._speed)
  }

  /** Pause playback */
  pause (): void {
    if (this._timerId) {
      clearInterval(this._timerId)
      this._timerId = null
    }
    if (this._status === 'playing') {
      this._setStatus('paused')
      this._handlers.onPause?.()
    }
  }

  /** Step one bar forward */
  stepForward (): void {
    if (this._playbackIndex < this._fullData.length - 1) {
      this._playbackIndex++
      this._applyData()
      this._handlers.onStep?.(
        this._playbackIndex,
        this._fullData.length,
        this._fullData[this._playbackIndex]
      )
    }
  }

  /** Step one bar backward */
  stepBackward (): void {
    if (this._playbackIndex > 0) {
      this._playbackIndex--
      this._applyData()
      this._handlers.onStep?.(
        this._playbackIndex,
        this._fullData.length,
        this._fullData[this._playbackIndex]
      )
    }
  }

  /** Jump to a specific index */
  seekTo (index: number): void {
    this._playbackIndex = Math.max(0, Math.min(index, this._fullData.length - 1))
    this._applyData()
  }

  /** Set playback speed in ms per bar */
  setSpeed (ms: number): void {
    this._speed = ms
    // If currently playing, restart timer with new speed
    if (this._status === 'playing') {
      this.pause()
      this.play()
    }
  }

  /** Get current state */
  getStatus (): ReplayStatus { return this._status }
  getIndex (): number { return this._playbackIndex }
  getTotal (): number { return this._fullData.length }
  getSpeed (): number { return this._speed }
  getCurrentBar (): KLineData | null {
    return this._fullData[this._playbackIndex] ?? null
  }

  /** Stop replay and restore original data */
  stop (): void {
    this.pause()
    if (this._originalData) {
      this._chart.applyNewData(this._originalData)
      this._originalData = null
    }
    this._fullData = []
    this._playbackIndex = 0
    this._setStatus('idle')
  }

  /** Clean up */
  destroy (): void {
    this.stop()
    this._handlers = {}
  }

  private _applyData (): void {
    const visibleData = this._fullData.slice(0, this._playbackIndex + 1)
    this._chart.applyNewData(visibleData)
  }

  private _setStatus (status: ReplayStatus): void {
    this._status = status
    this._handlers.onStatusChange?.(status)
  }
}
