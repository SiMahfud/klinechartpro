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

import { STORAGE_PREFIX } from './config'
import { SymbolInfo, Period, AlertConfig } from './types'

interface StoredPreferences {
  theme?: string
  locale?: string
  timezone?: string
  symbol?: SymbolInfo
  period?: Period
  mainIndicators?: string[]
  subIndicators?: string[]
  styles?: Record<string, any>
  drawings?: Record<string, any[]>
  alerts?: AlertConfig[]
}

/**
 * Persistence layer using localStorage.
 * All keys are namespaced with the storage prefix to avoid collisions.
 */
export class ChartStore {
  private _prefix: string
  private _enabled: boolean

  constructor (enabled: boolean = true, prefix?: string) {
    this._enabled = enabled
    this._prefix = prefix ?? STORAGE_PREFIX
  }

  private _key (name: string): string {
    return `${this._prefix}:${name}`
  }

  private _get<T> (key: string): T | null {
    if (!this._enabled) return null
    try {
      const raw = localStorage.getItem(this._key(key))
      return raw ? JSON.parse(raw) as T : null
    } catch {
      return null
    }
  }

  private _set (key: string, value: any): void {
    if (!this._enabled) return
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value))
    } catch (e) {
      console.warn('[ChartStore] Failed to save:', key, e)
    }
  }

  private _remove (key: string): void {
    if (!this._enabled) return
    localStorage.removeItem(this._key(key))
  }

  // --- Theme ---
  getTheme (): string | null { return this._get<string>('theme') }
  setTheme (theme: string): void { this._set('theme', theme) }

  // --- Locale ---
  getLocale (): string | null { return this._get<string>('locale') }
  setLocale (locale: string): void { this._set('locale', locale) }

  // --- Timezone ---
  getTimezone (): string | null { return this._get<string>('timezone') }
  setTimezone (timezone: string): void { this._set('timezone', timezone) }

  // --- Symbol ---
  getSymbol (): SymbolInfo | null { return this._get<SymbolInfo>('symbol') }
  setSymbol (symbol: SymbolInfo): void { this._set('symbol', symbol) }

  // --- Period ---
  getPeriod (): Period | null { return this._get<Period>('period') }
  setPeriod (period: Period): void { this._set('period', period) }

  // --- Indicators ---
  getMainIndicators (): string[] | null { return this._get<string[]>('mainIndicators') }
  setMainIndicators (indicators: string[]): void { this._set('mainIndicators', indicators) }

  getSubIndicators (): Record<string, string> | null {
    return this._get<Record<string, string>>('subIndicators')
  }
  setSubIndicators (indicators: Record<string, string>): void {
    this._set('subIndicators', indicators)
  }

  // --- Styles ---
  getStyles (): Record<string, any> | null { return this._get<Record<string, any>>('styles') }
  setStyles (styles: Record<string, any>): void { this._set('styles', styles) }

  // --- Drawings (per symbol) ---
  getDrawings (ticker: string): any[] | null {
    const all = this._get<Record<string, any[]>>('drawings')
    return all?.[ticker] ?? null
  }
  setDrawings (ticker: string, drawings: any[]): void {
    const all = this._get<Record<string, any[]>>('drawings') ?? {}
    all[ticker] = drawings
    this._set('drawings', all)
  }

  // --- Chart Type ---
  getChartType (): string | null { return this._get<string>('chartType') }
  setChartType (type: string): void { this._set('chartType', type) }

  // --- Renko Brick Size (0 = auto) ---
  getRenkoBrickSize (): number | null { return this._get<number>('renkoBrickSize') }
  setRenkoBrickSize (size: number): void { this._set('renkoBrickSize', size) }

  // --- Range Bar Size (0 = auto) ---
  getRangeBarSize (): number | null { return this._get<number>('rangeBarSize') }
  setRangeBarSize (size: number): void { this._set('rangeBarSize', size) }

  // --- Alerts ---
  getAlerts (): AlertConfig[] { return this._get<AlertConfig[]>('alerts') ?? [] }
  setAlerts (alerts: AlertConfig[]): void { this._set('alerts', alerts) }
  addAlert (alert: AlertConfig): void {
    const alerts = this.getAlerts()
    alerts.push(alert)
    this.setAlerts(alerts)
  }
  removeAlert (id: string): void {
    const alerts = this.getAlerts().filter(a => a.id !== id)
    this.setAlerts(alerts)
  }

  // --- Bulk ---
  getAll (): StoredPreferences {
    return {
      theme: this.getTheme() ?? undefined,
      locale: this.getLocale() ?? undefined,
      timezone: this.getTimezone() ?? undefined,
      symbol: this.getSymbol() ?? undefined,
      period: this.getPeriod() ?? undefined,
      mainIndicators: this.getMainIndicators() ?? undefined,
      styles: this.getStyles() ?? undefined,
      alerts: this.getAlerts()
    }
  }

  clear (): void {
    const keys = ['theme', 'locale', 'timezone', 'symbol', 'period',
      'mainIndicators', 'subIndicators', 'styles', 'drawings', 'alerts']
    keys.forEach(key => this._remove(key))
  }
}
