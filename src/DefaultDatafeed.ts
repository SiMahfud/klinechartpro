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

import { KLineData } from 'klinecharts'

import { Datafeed, SymbolInfo, Period, DatafeedSubscribeCallback } from './types'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
export type ConnectionStatusCallback = (status: ConnectionStatus) => void

export default class DefaultDatafeed implements Datafeed {
  constructor (apiKey: string) {
    this._apiKey = apiKey
  }

  private _apiKey: string
  private _prevSymbolMarket?: string
  private _prevSymbolTicker?: string
  private _ws?: WebSocket
  private _callback?: DatafeedSubscribeCallback
  private _connectionStatusCallback?: ConnectionStatusCallback
  private _reconnectAttempts: number = 0
  private _maxReconnectAttempts: number = 5
  private _reconnectTimer?: ReturnType<typeof setTimeout>
  private _currentSymbol?: SymbolInfo
  private _connectionStatus: ConnectionStatus = 'disconnected'

  onConnectionStatusChange (callback: ConnectionStatusCallback): void {
    this._connectionStatusCallback = callback
  }

  getConnectionStatus (): ConnectionStatus {
    return this._connectionStatus
  }

  private _setConnectionStatus (status: ConnectionStatus): void {
    this._connectionStatus = status
    this._connectionStatusCallback?.(status)
  }

  async searchSymbols (search?: string): Promise<SymbolInfo[]> {
    try {
      const response = await fetch(
        `https://api.polygon.io/v3/reference/tickers?apiKey=${this._apiKey}&active=true&search=${search ?? ''}`
      )
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }
      const result = await response.json()
      return (result.results || []).map((data: any) => ({
        ticker: data.ticker,
        name: data.name,
        shortName: data.ticker,
        market: data.market,
        exchange: data.primary_exchange,
        priceCurrency: data.currency_name,
        type: data.type,
        logo: ''
      }))
    } catch (error) {
      console.error('Symbol search error:', error)
      return []
    }
  }

  async getHistoryKLineData (symbol: SymbolInfo, period: Period, from: number, to: number): Promise<KLineData[]> {
    try {
      const response = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${symbol.ticker}/range/${period.multiplier}/${period.timespan}/${from}/${to}?apiKey=${this._apiKey}`
      )
      if (!response.ok) {
        throw new Error(`History data failed: ${response.status} ${response.statusText}`)
      }
      const result = await response.json()
      return (result.results || []).map((data: any) => ({
        timestamp: data.t,
        open: data.o,
        high: data.h,
        low: data.l,
        close: data.c,
        volume: data.v,
        turnover: data.vw
      }))
    } catch (error) {
      console.error('History data error:', error)
      return []
    }
  }

  subscribe (symbol: SymbolInfo, period: Period, callback: DatafeedSubscribeCallback): void {
    this._callback = callback
    this._currentSymbol = symbol

    if (this._prevSymbolMarket !== symbol.market) {
      // Close existing connection if market changed
      this._cleanupWebSocket()
      this._connectWebSocket(symbol)
    } else {
      // Same market, just update subscription
      if (this._prevSymbolTicker) {
        this._ws?.send(JSON.stringify({ action: 'unsubscribe', params: `T.${this._prevSymbolTicker}` }))
      }
      this._ws?.send(JSON.stringify({ action: 'subscribe', params: `T.${symbol.ticker}` }))
    }
    this._prevSymbolMarket = symbol.market
    this._prevSymbolTicker = symbol.ticker
  }

  unsubscribe (symbol: SymbolInfo, _period: Period): void {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ action: 'unsubscribe', params: `T.${symbol.ticker}` }))
    }
    this._prevSymbolTicker = undefined
    this._callback = undefined
  }

  destroy (): void {
    this._cleanupWebSocket()
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = undefined
    }
    this._callback = undefined
    this._connectionStatusCallback = undefined
    this._setConnectionStatus('disconnected')
  }

  private _connectWebSocket (symbol: SymbolInfo): void {
    this._setConnectionStatus('connecting')
    this._ws = new WebSocket(`wss://delayed.polygon.io/${symbol.market}`)

    this._ws.onopen = () => {
      this._ws?.send(JSON.stringify({ action: 'auth', params: this._apiKey }))
    }

    this._ws.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data)
        if (!Array.isArray(result) || result.length === 0) return

        const msg = result[0]
        if (msg.ev === 'status') {
          if (msg.status === 'auth_success') {
            this._setConnectionStatus('connected')
            this._reconnectAttempts = 0
            this._ws?.send(JSON.stringify({ action: 'subscribe', params: `T.${symbol.ticker}` }))
          } else if (msg.status === 'auth_failed') {
            console.error('WebSocket auth failed')
            this._setConnectionStatus('disconnected')
          }
        } else if (msg.ev === 'T' && msg.sym === this._currentSymbol?.ticker) {
          // Trade event — forward to callback
          this._callback?.({
            timestamp: msg.t,
            open: msg.o ?? msg.p,
            high: msg.h ?? msg.p,
            low: msg.l ?? msg.p,
            close: msg.c ?? msg.p,
            volume: msg.v ?? msg.s,
            turnover: msg.vw ?? 0
          })
        }
      } catch (e) {
        console.warn('WebSocket message parse error:', e)
      }
    }

    this._ws.onclose = () => {
      if (this._connectionStatus !== 'disconnected') {
        this._attemptReconnect(symbol)
      }
    }

    this._ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private _attemptReconnect (symbol: SymbolInfo): void {
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      this._setConnectionStatus('disconnected')
      return
    }
    this._setConnectionStatus('reconnecting')
    this._reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), 30000)
    this._reconnectTimer = setTimeout(() => {
      this._connectWebSocket(symbol)
    }, delay)
  }

  private _cleanupWebSocket (): void {
    if (this._ws) {
      this._ws.onclose = null
      this._ws.onerror = null
      this._ws.onmessage = null
      this._ws.onopen = null
      if (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING) {
        this._ws.close()
      }
      this._ws = undefined
    }
  }
}