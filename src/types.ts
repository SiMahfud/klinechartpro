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

import { KLineData, Styles, DeepPartial } from 'klinecharts'

export interface SymbolInfo {
  ticker: string
  name?: string
  shortName?: string
  exchange?: string
  market?: string
  pricePrecision?: number
  volumePrecision?: number
  priceCurrency?: string
  type?: string
  logo?: string
}

export interface Period {
  multiplier: number
  timespan: string
  text: string
}

export type DatafeedSubscribeCallback = (data: KLineData) => void

export interface Datafeed {
  searchSymbols (search?: string): Promise<SymbolInfo[]>
  getHistoryKLineData (symbol: SymbolInfo, period: Period, from: number, to: number): Promise<KLineData[]>
  subscribe (symbol: SymbolInfo, period: Period, callback: DatafeedSubscribeCallback): void
  unsubscribe (symbol: SymbolInfo, period: Period): void
}

export interface PersistenceOptions {
  enabled: boolean
  prefix?: string
}

export type AlertCondition = 'crosses_above' | 'crosses_below' | 'reaches'

export interface AlertConfig {
  id: string
  symbol: string
  condition: AlertCondition
  price: number
  message?: string
  triggered?: boolean
  callback?: () => void
}

export interface CustomIndicatorConfig {
  name: string
  category: 'main' | 'sub'
  shortName?: string
  calcParams?: any[]
  figures?: any[]
  calc?: (kLineDataList: KLineData[], params: any) => any[]
}

export interface ChartProOptions {
  container: string | HTMLElement
  styles?: DeepPartial<Styles>
  watermark?: string | Node
  theme?: string
  locale?: string
  drawingBarVisible?: boolean
  symbol: SymbolInfo
  period: Period
  periods?: Period[]
  timezone?: string
  mainIndicators?: string[]
  subIndicators?: string[]
  datafeed: Datafeed
  persistence?: PersistenceOptions
  chartType?: string
  renkoBrickSize?: number
  rangeBarSize?: number
  onError?: (error: Error) => void
  onSettingsChange?: (settings: any) => void
  onDrawingsChange?: (ticker: string, drawings: any[]) => void
}

export interface ChartPro {
  setTheme(theme: string): void
  getTheme(): string
  setStyles(styles: DeepPartial<Styles>): void
  getStyles(): Styles
  setLocale(locale: string): void
  getLocale(): string
  setTimezone(timezone: string): void
  getTimezone(): string
  setSymbol(symbol: SymbolInfo): void
  getSymbol(): SymbolInfo
  setPeriod(period: Period): void
  getPeriod(): Period
  ready?(): Promise<void>
  destroy?(): void
  setAlert?(alert: AlertConfig): void
  removeAlert?(id: string): void
  getAlerts?(): AlertConfig[]
  addComparisonSymbol?(symbol: SymbolInfo): void
  removeComparisonSymbol?(ticker: string): void
  registerCustomIndicator?(config: CustomIndicatorConfig): void
  // New features
  setChartType?(type: string): void
  getChartType?(): string
  startReplay?(dataSource: 'current' | 'custom'): void
  stopReplay?(): void
  showObjectTree?(): void
  showStyleEditor?(overlayId: string): void
  // Database Sync API
  getSettings?(): any
  setSettings?(settings: any): void
  getDrawings?(ticker: string): any[]
  setDrawings?(ticker: string, drawings: any[]): void
}
