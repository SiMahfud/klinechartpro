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

import { KLineData, Nullable, Chart, registerIndicator } from 'klinecharts'
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
  normalizedData: { timestamp: number, value: number }[]
  indicatorName: string
}

/**
 * Multi-symbol comparison overlay.
 * Normalizes prices to percentage change from the first visible candle,
 * then projects onto the main chart's price scale so lines overlay naturally.
 *
 * Each comparison symbol gets its own klinecharts indicator drawn on candle_pane.
 */
export class ComparisonManager {
  private _symbols: ComparisonSymbol[] = []
  private _widget: Nullable<Chart> = null
  private _datafeed: Nullable<Datafeed> = null
  private _colorIndex: number = 0
  private _onChange?: () => void
  private _registeredIndicators: Set<string> = new Set()

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

      const normalizedData = this._normalizeData(data)
      // Create a safe indicator name (replace non-alphanumeric chars)
      const safeTicker = symbol.ticker.replace(/[^a-zA-Z0-9]/g, '_')
      const indicatorName = `comp_${safeTicker}`

      const compSymbol: ComparisonSymbol = {
        symbol,
        data,
        color,
        visible: true,
        normalizedData,
        indicatorName
      }

      // Register the indicator for this symbol
      this._registerComparisonIndicator(compSymbol)

      this._symbols.push(compSymbol)
      this._onChange?.()
      return true
    } catch (error) {
      console.error('Failed to add comparison symbol:', error)
      return false
    }
  }

  private _registerComparisonIndicator (compSymbol: ComparisonSymbol): void {
    if (!this._widget) return

    const { indicatorName, normalizedData, color, symbol } = compSymbol
    const shortName = symbol.shortName || symbol.ticker

    // Build a timestamp -> percentage map for fast lookup
    const percentMap = new Map<number, number>()
    normalizedData.forEach(d => {
      percentMap.set(d.timestamp, d.value)
    })

    // Only register once per indicator name
    if (!this._registeredIndicators.has(indicatorName)) {
      registerIndicator({
        name: indicatorName,
        shortName: shortName,
        figures: [
          { key: 'compValue', title: `${shortName} `, type: 'line', styles: () => ({ color, size: 2 }) }
        ],
        calc: (dataList: KLineData[]) => {
          if (dataList.length === 0) return []
          const basePrice = dataList[0].close
          return dataList.map(kline => {
            const pct = percentMap.get(kline.timestamp)
            if (pct !== undefined) {
              // Map comparison % change onto main chart's base price
              return { compValue: basePrice * (1 + pct / 100) }
            }
            return { compValue: NaN }
          })
        }
      })
      this._registeredIndicators.add(indicatorName)
    }

    // Create the indicator on the main candle pane
    this._widget.createIndicator(indicatorName, true, { id: 'candle_pane' })
  }

  removeSymbol (ticker: string): void {
    const sym = this._symbols.find(s => s.symbol.ticker === ticker)
    if (sym) {
      // Remove the indicator from the chart
      try {
        this._widget?.removeIndicator('candle_pane', sym.indicatorName)
      } catch { /* ignore */ }
      this._symbols = this._symbols.filter(s => s.symbol.ticker !== ticker)
    }
    this._onChange?.()
  }

  toggleVisibility (ticker: string): void {
    const sym = this._symbols.find(s => s.symbol.ticker === ticker)
    if (sym) {
      sym.visible = !sym.visible
      // Toggle by removing/re-adding the indicator
      if (sym.visible) {
        this._widget?.createIndicator(sym.indicatorName, true, { id: 'candle_pane' })
      } else {
        try {
          this._widget?.removeIndicator('candle_pane', sym.indicatorName)
        } catch { /* ignore */ }
      }
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
    // Remove all indicators from chart
    for (const sym of this._symbols) {
      try {
        this._widget?.removeIndicator('candle_pane', sym.indicatorName)
      } catch { /* ignore */ }
    }
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
