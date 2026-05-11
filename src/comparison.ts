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

import { KLineData, Nullable, Chart } from 'klinecharts'
import { SymbolInfo, Period, Datafeed } from './types'

const COMPARISON_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
]

export interface ComparisonSymbol {
  symbol: SymbolInfo
  data: KLineData[]
  color: string
  visible: boolean
  normalizedData?: { timestamp: number, value: number }[]
}

/**
 * Multi-symbol comparison overlay.
 * Normalizes prices to percentage change from the first visible candle.
 */
export class ComparisonManager {
  private _symbols: ComparisonSymbol[] = []
  private _widget: Nullable<Chart> = null
  private _datafeed: Nullable<Datafeed> = null
  private _colorIndex: number = 0
  private _onChange?: () => void

  constructor (widget: Nullable<Chart>, datafeed: Nullable<Datafeed>) {
    this._widget = widget
    this._datafeed = datafeed
  }

  setOnChange (callback: () => void): void {
    this._onChange = callback
  }

  getSymbols (): ComparisonSymbol[] {
    return [...this._symbols]
  }

  async addSymbol (symbol: SymbolInfo, period: Period, from: number, to: number): Promise<boolean> {
    // Check if already added
    if (this._symbols.find(s => s.symbol.ticker === symbol.ticker)) {
      return false
    }

    if (!this._datafeed) return false

    try {
      const data = await this._datafeed.getHistoryKLineData(symbol, period, from, to)
      if (data.length === 0) return false

      const color = COMPARISON_COLORS[this._colorIndex % COMPARISON_COLORS.length]
      this._colorIndex++

      const compSymbol: ComparisonSymbol = {
        symbol,
        data,
        color,
        visible: true,
        normalizedData: this._normalizeData(data)
      }

      this._symbols.push(compSymbol)
      this._onChange?.()
      return true
    } catch (error) {
      console.error('Failed to add comparison symbol:', error)
      return false
    }
  }

  removeSymbol (ticker: string): void {
    this._symbols = this._symbols.filter(s => s.symbol.ticker !== ticker)
    this._onChange?.()
  }

  toggleVisibility (ticker: string): void {
    const sym = this._symbols.find(s => s.symbol.ticker === ticker)
    if (sym) {
      sym.visible = !sym.visible
      this._onChange?.()
    }
  }

  private _normalizeData (data: KLineData[]): { timestamp: number, value: number }[] {
    if (data.length === 0) return []
    const basePrice = data[0].close
    if (basePrice === 0) return []

    return data.map(d => ({
      timestamp: d.timestamp,
      value: ((d.close - basePrice) / basePrice) * 100
    }))
  }

  clear (): void {
    this._symbols = []
    this._colorIndex = 0
    this._onChange?.()
  }

  destroy (): void {
    this.clear()
    this._widget = null
    this._datafeed = null
    this._onChange = undefined
  }
}
