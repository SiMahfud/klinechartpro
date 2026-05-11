# KLineChart Pro

A professional-grade charting component built on [KLineChart](https://github.com/liihuu/KLineChart), powered by **SolidJS**. Features 23 built-in drawing tools (including TradingView-style position tools), multi-language support (5 locales), price alerts, data persistence, and a custom overlay API.

## ✨ Features

### Core
- 📊 Built on KLineChart with SolidJS rendering
- 🎨 Light & Dark themes with CSS custom properties
- 🌐 5 locales: Chinese, English, Indonesian, Japanese, Korean
- 💾 Data persistence via localStorage (symbols, periods, indicators, drawings)
- 🔔 Price alert system with browser notifications
- 📈 Multi-symbol comparison mode
- ⚡ Performance monitoring panel (FPS, memory, WS latency)
- ♿ Full modal accessibility (focus trap, keyboard nav, ARIA)
- 📱 Responsive layout with mobile support

### Drawing Tools (25 built-in)

| Category | Tools |
|---|---|
| **Lines** | Horizontal/Vertical (straight, ray, segment), Trend Line, Ray, Segment, Arrow, Price Line |
| **Channels** | Price Channel, Parallel Line |
| **Shapes** | Circle, Rectangle, Parallelogram, Triangle |
| **Fibonacci** | Line, Segment, Circle, Spiral, Fan, Extension |
| **Gann** | Gann Box |
| **Waves** | XABCD, ABCD, 3-Wave, 5-Wave, 8-Wave, Any Wave |
| **Trading** | Long Position, Short Position, Measure Tool |
| **Annotation** | Volume Profile (FRVP), Price Range, Text Note, Anchored VWAP, Price Label |

### Technical Indicators (26 built-in)

**Main chart:** MA, EMA, SMA, BOLL, SAR, BBI  
**Sub chart:** VOL, MACD, KDJ, RSI, BIAS, BRAR, CCI, DMI, CR, PSY, DMA, TRIX, OBV, VR, WR, MTM, EMV, ROC, PVT, AO

### Advanced Features 🆕

| Feature | Description |
|---|---|
| **⏯ Bar Replay** | Step through historical data bar by bar with play/pause/speed controls |
| **⌨️ Keyboard Shortcuts** | Configurable hotkeys for all chart operations |
| **🌳 Object Tree** | Manage all drawings — toggle visibility, select, delete |
| **💾 Chart Templates** | Save/load indicator + style presets |
| **🏷️ Price Labels** | Custom price markers on Y-axis |
| **🔗 Crosshair Sync** | Synchronize crosshair across multiple charts |
| **🎨 Style Editor** | Edit drawing properties (color, width, style) via double-click or right-click |

---

## 📦 Installation

```bash
npm install klinecharts @anthropic/klinecharts-pro
```

## 🚀 Quick Start

```typescript
import { KLineChartPro, DefaultDatafeed } from '@anthropic/klinecharts-pro'

const chart = new KLineChartPro({
  container: 'chart-container',
  symbol: { ticker: 'AAPL', name: 'Apple Inc.', market: 'stocks' },
  period: { multiplier: 1, timespan: 'day', text: 'D' },
  datafeed: new DefaultDatafeed('YOUR_API_KEY'),
  theme: 'dark',
  locale: 'en-US'
})

// Wait for chart to be ready before calling methods
await chart.ready()
console.log('Chart initialized:', chart.getSymbol())
```

## 🔧 API Reference

### KLineChartPro

```typescript
const chart = new KLineChartPro(options: ChartProOptions)
```

#### ChartProOptions

| Property | Type | Default | Description |
|---|---|---|---|
| `container` | `string \| HTMLElement` | *required* | Container element or ID |
| `symbol` | `SymbolInfo` | *required* | Initial symbol |
| `period` | `Period` | *required* | Initial timeframe |
| `datafeed` | `Datafeed` | *required* | Data feed implementation |
| `theme` | `string` | `'light'` | `'light'` or `'dark'` |
| `locale` | `string` | `'zh-CN'` | Locale code |
| `timezone` | `string` | `'Asia/Shanghai'` | Timezone |
| `drawingBarVisible` | `boolean` | `true` | Show drawing toolbar |
| `mainIndicators` | `string[]` | `['MA']` | Initial main indicators |
| `subIndicators` | `string[]` | `['VOL']` | Initial sub indicators |
| `persistence` | `PersistenceOptions` | — | Enable localStorage persistence |
| `onError` | `(error: Error) => void` | — | Error callback |

#### Instance Methods

| Method | Returns | Description |
|---|---|---|
| `ready()` | `Promise<void>` | Resolves when chart is fully initialized |
| `setTheme(theme)` | `void` | Switch theme |
| `getTheme()` | `string` | Get current theme |
| `setLocale(locale)` | `void` | Switch locale |
| `getLocale()` | `string` | Get current locale |
| `setTimezone(tz)` | `void` | Switch timezone |
| `getTimezone()` | `string` | Get current timezone |
| `setSymbol(symbol)` | `void` | Switch symbol |
| `getSymbol()` | `SymbolInfo` | Get current symbol |
| `setPeriod(period)` | `void` | Switch period |
| `getPeriod()` | `Period` | Get current period |
| `destroy()` | `void` | Clean up and unmount |

---

## 📊 Custom Indicators

Register your own technical indicators using the `registerCustomIndicator` API.
**They will automatically appear in the Indicator Menu** — no extra configuration needed.

```typescript
import { registerCustomIndicator } from '@anthropic/klinecharts-pro'

// Simple form — auto-appears in Sub Indicator menu with shortName as label
registerCustomIndicator({
  name: 'MyRSI',
  shortName: 'MRSI',
  calcParams: [14],
  figures: [
    { key: 'rsi', title: 'RSI: ', type: 'line' }
  ],
  calc: (dataList, indicator) => {
    const period = indicator.calcParams[0] as number
    let gains = 0, losses = 0

    return dataList.map((kLineData, i) => {
      if (i < period) return { rsi: NaN }

      if (i === period) {
        // Initial average
        for (let j = 1; j <= period; j++) {
          const change = dataList[j].close - dataList[j - 1].close
          if (change > 0) gains += change
          else losses -= change
        }
        gains /= period
        losses /= period
      } else {
        const change = kLineData.close - dataList[i - 1].close
        gains = (gains * (period - 1) + (change > 0 ? change : 0)) / period
        losses = (losses * (period - 1) + (change < 0 ? -change : 0)) / period
      }

      const rs = losses === 0 ? 100 : gains / losses
      return { rsi: 100 - (100 / (1 + rs)) }
    })
  }
})

// Advanced form — specify where it appears and with what label
registerCustomIndicator({
  template: {
    name: 'VWAP',
    shortName: 'VWAP',
    calcParams: [],
    figures: [{ key: 'vwap', title: 'VWAP: ', type: 'line' }],
    calc: (dataList) => {
      let cumVol = 0, cumTP = 0
      return dataList.map((d) => {
        const tp = (d.high + d.low + d.close) / 3
        cumVol += d.volume ?? 0
        cumTP += tp * (d.volume ?? 0)
        return { vwap: cumVol > 0 ? cumTP / cumVol : NaN }
      })
    }
  },
  label: 'Volume Weighted Avg Price',
  paneType: 'main'  // appears in Main Indicator menu (overlaid on candles)
})
```

> **Auto Menu:** Custom indicators automatically appear in the indicator selector dialog.
> - `paneType: 'main'` → listed under "Main Indicators"
> - `paneType: 'sub'` (default) → listed under "Sub Indicators"

### Indicator Figure Types

| Type | Description |
|---|---|
| `'line'` | Standard line chart |
| `'bar'` | Bar/histogram |
| `'circle'` | Circle markers |
| `'rect'` | Rectangle shapes |

### Indicator Configuration

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Unique identifier |
| `shortName` | `string` | Display name in tooltips |
| `calcParams` | `number[]` | Default calculation parameters |
| `figures` | `Figure[]` | What to render (key, title, type) |
| `calc` | `Function` | Calculation logic — receives `dataList` and `indicator` |
| `series` | `string` | `'normal'`, `'price'`, or `'volume'` |
| `precision` | `number` | Decimal places |

---

## 🛠 Custom Drawing Tools (Overlays)

Register your own drawing tools using the `registerCustomOverlay` API.
**They will automatically appear in the Drawing Toolbar** under a "Custom" group.

```typescript
import { registerCustomOverlay } from '@anthropic/klinecharts-pro'

// Simple form — auto-appears in Drawing Bar with template.name as label
registerCustomOverlay({
  name: 'myTrendZone',
  totalStep: 3, // number of clicks to complete (entry + points + done)
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  styles: {
    polygon: { color: 'rgba(76, 175, 80, 0.15)' }
  },
  createPointFigures: ({ coordinates, overlay }) => {
    if (coordinates.length < 2) return []

    // Access price data via overlay.points[i].value
    // Access custom data via overlay.extendData
    return [
      {
        type: 'polygon',
        attrs: {
          coordinates: [
            coordinates[0],
            { x: coordinates[1].x, y: coordinates[0].y },
            coordinates[1],
            { x: coordinates[0].x, y: coordinates[1].y }
          ]
        },
        styles: { style: 'stroke_fill' }
      },
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: coordinates[0].x + 4,
          y: coordinates[0].y - 4,
          text: 'My Zone'
        },
        styles: { color: '#4CAF50', size: 12 }
      }
    ]
  }
})

// Advanced form — with custom display label
registerCustomOverlay({
  template: { name: 'orderBlock', totalStep: 3, ... },
  label: 'Order Block'
})
```

> **Auto Menu:** Custom overlays appear as a new "Custom" group at the bottom of the drawing toolbar.
> The group is only visible when at least one custom overlay has been registered.

### Figure Types

| Type | Attributes | Description |
|---|---|---|
| `line` | `{ coordinates: [{x, y}, {x, y}] }` | Line between two points |
| `polygon` | `{ coordinates: [{x, y}, ...] }` | Filled/stroked polygon |
| `text` | `{ x, y, text }` | Text label |

### Figure Styles

```typescript
{
  style: 'solid' | 'dashed' | 'fill' | 'stroke_fill',
  color: string,
  size: number  // line width or font size
}
```

---

## 💾 Data Persistence

```typescript
import { ChartStore } from '@anthropic/klinecharts-pro'

const store = new ChartStore(true, 'my-chart') // enabled, custom prefix

// Auto-saves: theme, locale, timezone, symbol, period, indicators
store.setTheme('dark')
store.setSymbol({ ticker: 'BTCUSD' })
store.getTheme() // 'dark'

// Drawing persistence per symbol
store.setDrawings('AAPL', drawingData)
store.getDrawings('AAPL')

// Alerts
store.addAlert({ id: '1', symbol: 'AAPL', condition: 'crosses_above', price: 200 })
store.getAlerts() // [...]

// Bulk operations
store.getAll()
store.clear()
```

---

## ✏️ Drawing Store (Undo/Redo)

```typescript
import { DrawingStore, ChartStore } from '@anthropic/klinecharts-pro'

const store = new ChartStore(true)
const drawings = new DrawingStore(store)

// Track actions
drawings.pushAction({ type: 'add', overlay: myOverlay })

// Undo/Redo
if (drawings.canUndo()) drawings.undo()
if (drawings.canRedo()) drawings.redo()

// Export/Import
const json = drawings.exportDrawings('AAPL')
drawings.importDrawings(json)
```

---

## 🔔 Price Alerts

```typescript
import { evaluateAlerts } from '@anthropic/klinecharts-pro'

// Evaluate on each price update
const triggeredIds = evaluateAlerts(alerts, currentPrice, previousPrice)
// Supports: 'crosses_above', 'crosses_below', 'reaches'
// Automatically fires browser Notification API if permission granted
```

---

## 🌐 Multi-Language

Built-in locales: `zh-CN`, `en-US`, `id-ID`, `ja-JP`, `ko-KR`

```typescript
import { loadLocales } from '@anthropic/klinecharts-pro'

// Add a custom locale
loadLocales('pt-BR', {
  indicator: 'Indicador',
  setting: 'Configuração',
  // ... all keys
})
```

---

## 🛡 Error Handling

```typescript
import { withRetry, withTimeout, ErrorManager } from '@anthropic/klinecharts-pro'

// Retry with exponential backoff
const data = await withRetry(() => fetchData(), {
  maxAttempts: 3,
  baseDelay: 1000,
  onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error)
})

// Timeout wrapper
const result = await withTimeout(somePromise, 5000, 'Request timed out')

// Centralized error management
const errMgr = new ErrorManager()
const unsub = errMgr.onError(err => showToast(err.message))
errMgr.report(new Error('Something went wrong'))
unsub() // cleanup
```

---

## 📈 Multi-Symbol Comparison

```typescript
import { ComparisonManager } from '@anthropic/klinecharts-pro'

const comparison = new ComparisonManager(chartWidget, datafeed)

await comparison.addSymbol(
  { ticker: 'MSFT' },
  { multiplier: 1, timespan: 'day', text: 'D' },
  fromTimestamp, toTimestamp
)

comparison.getSymbols() // [{ symbol, data, color, visible, normalizedData }]
comparison.toggleVisibility('MSFT')
comparison.removeSymbol('MSFT')
comparison.destroy()
```

---

## 📊 DefaultDatafeed

```typescript
import { DefaultDatafeed } from '@anthropic/klinecharts-pro'

const feed = new DefaultDatafeed('YOUR_POLYGON_API_KEY')

// Connection monitoring
feed.onConnectionStatusChange((status) => {
  // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  console.log('WebSocket:', status)
})

// Auto-reconnect with exponential backoff (up to 5 attempts)
// Proper cleanup
feed.destroy()
```

---

## 🏗 Architecture

```
src/
├── index.ts                # Entry point + exports
├── KLineChartPro.tsx       # Main class (lifecycle, API)
├── ChartProComponent.tsx   # SolidJS component
├── types.ts                # TypeScript interfaces
├── config.ts               # Shared constants
├── registry.ts             # Custom tool registry (auto-menu)
├── error.ts                # Error handling system
├── store.ts                # localStorage persistence
├── drawing-store.ts        # Undo/redo + drawing persistence
├── comparison.ts           # Multi-symbol comparison
├── bar-replay.ts           # 🆕 Bar replay engine
├── keyboard-shortcuts.ts   # 🆕 Keyboard shortcut manager
├── chart-template.ts       # 🆕 Template save/load
├── crosshair-sync.ts       # 🆕 Multi-chart crosshair sync
├── DefaultDatafeed.ts      # Polygon.io data feed
├── i18n/                   # 5 locale files
├── extension/              # 25 overlay templates
│   ├── longPosition.ts     # Long Position tool
│   ├── shortPosition.ts    # Short Position tool
│   ├── frvp.ts             # Volume Profile
│   ├── measure.ts          # Measure tool
│   ├── priceRange.ts       # Price Range zone
│   ├── textNote.ts         # Text annotation
│   ├── anchoredVwap.ts     # 🆕 Anchored VWAP
│   ├── priceLabel.ts       # 🆕 Price Label
│   └── ... (17 more)
├── widget/
│   ├── drawing-bar/        # Drawing toolbar (8 groups)
│   ├── replay-bar/         # 🆕 Replay controls
│   ├── object-tree/        # 🆕 Object manager modal
│   ├── drawing-style-editor/ # 🆕 Style editor modal
│   ├── context-menu/       # 🆕 Right-click menu
│   ├── error-banner/       # Error notification
│   ├── performance-panel/  # Debug panel
│   ├── alert-modal/        # Price alerts UI
│   └── ...
├── component/              # Reusable UI (Modal, Select, etc.)
└── __tests__/              # 38 unit tests
```

---

## ⏯ Bar Replay

```typescript
import { BarReplayManager } from '@anthropic/klinecharts-pro'

const replay = new BarReplayManager(chart, datafeed)

// Set event handlers
replay.setHandlers({
  onStep: (index, total, bar) => console.log(`${index}/${total}`),
  onPlay: () => console.log('Playing'),
  onPause: () => console.log('Paused'),
  onEnd: () => console.log('Replay ended'),
  onStatusChange: (status) => console.log('Status:', status)
})

// Option 1: Use already-loaded chart data
await replay.start({ dataSource: 'current', speed: 500, startFrom: 0 })

// Option 2: Load custom historical data
await replay.loadData(symbol, period, fromTimestamp, toTimestamp)
await replay.start({ dataSource: 'custom', speed: 250 })

// Controls
replay.play()        // Auto-advance
replay.pause()       // Pause
replay.stepForward() // Next bar
replay.stepBackward() // Previous bar
replay.seekTo(50)    // Jump to index
replay.setSpeed(100) // 100ms per bar

// State
replay.getStatus()     // 'idle' | 'playing' | 'paused' | 'ended'
replay.getIndex()      // Current position
replay.getTotal()      // Total bars

// Cleanup
replay.stop()    // Restore original data
replay.destroy() // Full cleanup
```

---

## ⌨️ Keyboard Shortcuts

```typescript
import { KeyboardShortcutManager } from '@anthropic/klinecharts-pro'

const shortcuts = new KeyboardShortcutManager(containerElement)

// Register shortcuts
shortcuts.register({ key: 'ctrl+z', description: 'Undo', callback: () => drawings.undo() })
shortcuts.register({ key: 'ctrl+y', description: 'Redo', callback: () => drawings.redo() })
shortcuts.register({ key: 'delete', callback: () => chart.removeOverlay() })
shortcuts.register({ key: 'escape', callback: () => chart.removeOverlay() })
shortcuts.register({ key: 'alt+s', callback: () => takeScreenshot() })
shortcuts.register({ key: '1', callback: () => setPeriod('1m') })
shortcuts.register({ key: '5', callback: () => setPeriod('5m') })

// Disable during modals
shortcuts.setEnabled(false)
shortcuts.setEnabled(true)

// Cleanup
shortcuts.destroy()
```

---

## 💾 Chart Templates

```typescript
import { ChartTemplateManager } from '@anthropic/klinecharts-pro'

const templates = new ChartTemplateManager(chartStore)

// Save current configuration
templates.saveTemplate({
  name: 'My Scalping Setup',
  mainIndicators: ['EMA', 'BOLL'],
  subIndicators: ['RSI', 'MACD'],
  theme: 'dark',
  period: { multiplier: 5, timespan: 'minute', text: '5m' },
  createdAt: Date.now()
})

// List and load
templates.getTemplateNames() // ['My Scalping Setup']
const tmpl = templates.loadTemplate('My Scalping Setup')

// Delete
templates.deleteTemplate('My Scalping Setup')
```

---

## 🔗 Crosshair Sync

```typescript
import { CrosshairSyncManager } from '@anthropic/klinecharts-pro'

const sync = new CrosshairSyncManager()

// Link multiple chart instances
sync.addChart(chart1)
sync.addChart(chart2)

// Now moving crosshair on chart1 moves it on chart2 and vice versa

sync.removeChart(chart1)
sync.destroy() // Unsubscribe all
```

---

## 📄 License

Apache License 2.0
