import { KLineChartPro, DefaultDatafeed } from './src/index'
import type { SymbolInfo, Period, DatafeedSubscribeCallback } from './src/types'
import type { KLineData } from 'klinecharts'

// Generate dummy KLine data
function generateDummyData(): KLineData[] {
  const data: KLineData[] = []
  let price = 100
  let timestamp = new Date('2023-01-01').getTime()
  
  for (let i = 0; i < 500; i++) {
    const open = price
    const high = price + Math.random() * 5
    const low = price - Math.random() * 5
    const close = low + Math.random() * (high - low)
    const volume = Math.random() * 1000
    
    data.push({ timestamp, open, high, low, close, volume })
    
    price = close
    timestamp += 24 * 60 * 60 * 1000 // +1 day
  }
  return data
}

const dummyData = generateDummyData()

// Create a custom datafeed for testing
class DummyDatafeed extends DefaultDatafeed {
  private timer?: ReturnType<typeof setInterval>

  constructor() {
    super('')
  }
  
  async searchSymbols(search?: string): Promise<SymbolInfo[]> {
    return [{ ticker: 'TEST', name: 'Test Symbol', market: 'crypto' }]
  }

  async getHistoryKLineData(symbol: SymbolInfo, period: Period, from: number, to: number): Promise<KLineData[]> {
    return dummyData.filter(d => d.timestamp >= from && d.timestamp <= to)
  }

  subscribe(symbol: SymbolInfo, period: Period, callback: DatafeedSubscribeCallback): void {
    // Simulate live data tick every 2 seconds
    this.timer = setInterval(() => {
      const last = dummyData[dummyData.length - 1]
      const newPrice = last.close + (Math.random() - 0.5) * 2
      const tick = {
        timestamp: last.timestamp,
        open: last.open,
        high: Math.max(last.high, newPrice),
        low: Math.min(last.low, newPrice),
        close: newPrice,
        volume: last.volume! + Math.random() * 10,
        turnover: 0
      }
      dummyData[dummyData.length - 1] = tick
      callback(tick)
    }, 2000)
  }

  unsubscribe(): void {
    if (this.timer) clearInterval(this.timer)
  }
}

// Initialize the chart
try {
  const chart = new KLineChartPro({
    container: document.getElementById('app')!,
    symbol: { ticker: 'TEST', name: 'Test Symbol', market: 'crypto' },
    period: { multiplier: 1, timespan: 'day', text: 'D' },
    datafeed: new DummyDatafeed(),
    theme: 'dark',
    locale: 'en-US'
  })

  // Attach to window so you can test API in console!
  ;(window as any).chartApi = chart
  console.log('Chart API available at `window.chartApi`')
} catch (e: any) {
  document.body.innerHTML += `<div style="color:red; background:white; padding:20px; z-index:9999; position:absolute; top:0; left:0;"><h1>Error Details:</h1><pre>${e.stack || e.message}</pre></div>`
  console.error(e)
}
