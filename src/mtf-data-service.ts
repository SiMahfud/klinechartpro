/**
 * MTF Data Service — Multi-Timeframe Data API
 * 
 * Provides a reusable API for indicators, overlays, and strategies
 * to fetch historical data from timeframes other than the currently
 * displayed chart timeframe.
 * 
 * Features:
 * - In-memory caching per symbol+timeframe
 * - De-duplication of concurrent requests (in-flight promise tracking)
 * - Auto-clear cache on symbol change
 * 
 * Usage from indicators/overlays:
 *   const mtf = (window as any)._mtfDataService as MTFDataService
 *   if (mtf) {
 *     const dailyData = await mtf.getTimeframeData({ multiplier: 1, timespan: 'day' })
 *   }
 */

import { KLineData } from 'klinecharts'
import { Datafeed, SymbolInfo, Period } from './types'

export class MTFDataService {
  private _datafeed: Datafeed | null = null
  private _symbol: SymbolInfo | null = null
  private _currentPeriod: Period | null = null
  private _cache: Map<string, KLineData[]> = new Map()
  private _inflight: Map<string, Promise<KLineData[]>> = new Map()

  /**
   * Build cache key from symbol + period.
   */
  private _cacheKey (period: Period): string {
    const ticker = this._symbol?.ticker ?? 'unknown'
    return `${ticker}:${period.multiplier}:${period.timespan}`
  }

  /**
   * Calculate from/to timestamps for data fetching.
   */
  private _calcTimeRange (period: Period, barCount: number): [number, number] {
    const to = Date.now()
    let from = to

    switch (period.timespan) {
      case 'minute':
        from = to - barCount * period.multiplier * 60 * 1000
        break
      case 'hour':
        from = to - barCount * period.multiplier * 60 * 60 * 1000
        break
      case 'day':
        from = to - barCount * period.multiplier * 24 * 60 * 60 * 1000
        break
      case 'week':
        from = to - barCount * period.multiplier * 7 * 24 * 60 * 60 * 1000
        break
      case 'month':
        from = to - barCount * period.multiplier * 30 * 24 * 60 * 60 * 1000
        break
      case 'year':
        from = to - barCount * period.multiplier * 365 * 24 * 60 * 60 * 1000
        break
      default:
        from = to - barCount * 24 * 60 * 60 * 1000
    }

    return [from, to]
  }

  /**
   * Set the current context. Called from ChartProComponent
   * when the chart initializes and when symbol/period changes.
   */
  setContext (symbol: SymbolInfo, period: Period, datafeed: Datafeed): void {
    const symbolChanged = this._symbol?.ticker !== symbol.ticker
    this._symbol = symbol
    this._currentPeriod = period
    this._datafeed = datafeed

    if (symbolChanged) {
      this.clearCache()
    }
  }

  /**
   * Fetch historical data for a different timeframe.
   * Results are cached — repeated calls return cached data immediately.
   * Concurrent requests for the same key are de-duplicated.
   * 
   * @param period — The desired timeframe
   * @param barCount — Number of bars to fetch (default 500)
   * @returns Promise resolving to KLineData array
   */
  async getTimeframeData (period: Period, barCount: number = 500): Promise<KLineData[]> {
    if (!this._datafeed || !this._symbol) {
      console.warn('[MTFDataService] Not initialized — call setContext() first')
      return []
    }

    const key = this._cacheKey(period)

    // Return cached data if available
    const cached = this._cache.get(key)
    if (cached) {
      return cached
    }

    // De-duplicate: if there's already an in-flight request for this key, wait for it
    const inflight = this._inflight.get(key)
    if (inflight) {
      return inflight
    }

    // Fetch new data
    const [from, to] = this._calcTimeRange(period, barCount)
    const fetchPromise = this._datafeed.getHistoryKLineData(this._symbol, period, from, to)
      .then(data => {
        const filtered = data.filter(d => d.close > 0)
        this._cache.set(key, filtered)
        this._inflight.delete(key)
        return filtered
      })
      .catch(error => {
        console.error('[MTFDataService] Failed to fetch data:', error)
        this._inflight.delete(key)
        return []
      })

    this._inflight.set(key, fetchPromise)
    return fetchPromise
  }

  /**
   * Synchronous cache lookup.
   * Returns null if data hasn't been fetched yet.
   */
  getCachedData (period: Period): KLineData[] | null {
    const key = this._cacheKey(period)
    return this._cache.get(key) ?? null
  }

  /**
   * Invalidate cache for a specific timeframe.
   */
  invalidate (period: Period): void {
    const key = this._cacheKey(period)
    this._cache.delete(key)
  }

  /**
   * Clear all cached data. Called when symbol changes.
   */
  clearCache (): void {
    this._cache.clear()
    this._inflight.clear()
  }

  /**
   * Get the current symbol.
   */
  getSymbol (): SymbolInfo | null {
    return this._symbol
  }

  /**
   * Get the current chart period.
   */
  getCurrentPeriod (): Period | null {
    return this._currentPeriod
  }

  /**
   * Check if service is initialized and ready.
   */
  isReady (): boolean {
    return this._datafeed !== null && this._symbol !== null
  }

  /**
   * Cleanup.
   */
  destroy (): void {
    this.clearCache()
    this._datafeed = null
    this._symbol = null
    this._currentPeriod = null
  }
}
