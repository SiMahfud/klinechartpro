# KLineChart Pro

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![KLineChart](https://img.shields.io/badge/based%20on-KLineChart-orange)](https://github.com/liihuu/KLineChart)

A professional-grade, TradingView-inspired charting component built on [KLineChart](https://github.com/liihuu/KLineChart), powered by **SolidJS**. Features 25 built-in drawing tools, bar replay, keyboard shortcuts, multi-chart type support, and a complete custom tool API.

> 🔗 **Repository**: [github.com/SiMahfud/klinechartpro](https://github.com/SiMahfud/klinechartpro)  
> 📦 Forked from [klinecharts/pro](https://github.com/klinecharts/pro)

---

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

### Chart Types (6 types)

| Type | Key | Description |
|---|---|---|
| **Candles** | `candle_solid` | Standard filled candlestick (default) |
| **Hollow Candles** | `candle_stroke` | All candles outlined |
| **Up Hollow** | `candle_up_stroke` | Up candles hollow, down filled |
| **Down Hollow** | `candle_down_stroke` | Down candles hollow, up filled |
| **OHLC Bars** | `ohlc` | Traditional open-high-low-close bars |
| **Area** | `area` | Filled area chart |

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

### Advanced Features

| Feature | Description |
|---|---|
| **⏯ Bar Replay** | Step through historical data bar by bar with play/pause/speed controls |
| **⌨️ Keyboard Shortcuts** | Configurable hotkeys for all chart operations |
| **🌳 Object Tree** | Manage all drawings — toggle visibility, select, delete |
| **💾 Chart Templates** | Save/load indicator + style presets via localStorage |
| **🏷️ Price Labels** | Custom price markers on Y-axis |
| **🔗 Crosshair Sync** | Synchronize crosshair across multiple chart instances |
| **🎨 Style Editor** | Edit drawing properties (color, width, style) via right-click |
| **📋 Context Menu** | Right-click overlay menu with Edit/Hide/Delete actions |
| **📊 Chart Type Selector** | Switch between 6 chart types from the toolbar |

---

## 📦 Installation

```bash
npm install klinecharts klinecharts-pro
```

Or clone this repository:

```bash
git clone https://github.com/SiMahfud/klinechartpro.git
cd klinechartpro
npm install
npm run dev
```

---

## 🚀 Quick Start

```typescript
import { KLineChartPro, DefaultDatafeed } from 'klinecharts-pro'

const chart = new KLineChartPro({
  container: 'chart-container',
  symbol: { ticker: 'AAPL', name: 'Apple Inc.', market: 'stocks' },
  period: { multiplier: 1, timespan: 'day', text: 'D' },
  datafeed: new DefaultDatafeed('YOUR_POLYGON_API_KEY'),
  theme: 'dark',
  locale: 'en-US'
})

// Wait for chart to be ready before calling methods
await chart.ready()
console.log('Chart initialized:', chart.getSymbol())
```

---

## 🔧 API Reference

### Core Methods

```typescript
// Theme
chart.setTheme('dark')          // 'dark' | 'light'
chart.getTheme()

// Locale
chart.setLocale('en-US')        // 'en-US' | 'zh-CN' | 'id-ID' | 'ja-JP' | 'ko-KR'
chart.getLocale()

// Symbol & Period
chart.setSymbol({ ticker: 'MSFT', name: 'Microsoft' })
chart.getSymbol()
chart.setPeriod({ multiplier: 5, timespan: 'minute', text: '5m' })
chart.getPeriod()

// Timezone
chart.setTimezone('Asia/Jakarta')
chart.getTimezone()

// Styles (deep partial merge)
chart.setStyles({ candle: { bar: { upColor: '#26A69A' } } })
chart.getStyles()
```

### Chart Type

```typescript
// Switch chart type
chart.setChartType('ohlc')        // candle_solid | candle_stroke | candle_up_stroke | candle_down_stroke | ohlc | area
chart.getChartType()              // Returns current type
```

### Bar Replay

```typescript
// Start replay using current chart data
chart.startReplay('current')

// Or start replay loading custom historical data
chart.startReplay('custom')

// Stop and restore original data
chart.stopReplay()
```

**Programmatic control via `BarReplayManager`:**

```typescript
import { BarReplayManager } from 'klinecharts-pro'

const replay = new BarReplayManager(chartWidget, datafeed)

replay.setHandlers({
  onStep: (index, total, bar) => console.log(`${index}/${total}`),
  onPlay: () => console.log('Playing'),
  onPause: () => console.log('Paused'),
  onEnd: () => console.log('Replay ended'),
  onStatusChange: (status) => console.log('Status:', status)
})

await replay.start({ dataSource: 'current', speed: 500, startFrom: 0 })

// Controls
replay.play()           // Auto-advance
replay.pause()          // Pause
replay.stepForward()    // Next bar
replay.stepBackward()   // Previous bar
replay.seekTo(50)       // Jump to index
replay.setSpeed(100)    // 100ms per bar

// State
replay.getStatus()      // 'idle' | 'playing' | 'paused' | 'ended'
replay.getIndex()       // Current position
replay.getTotal()       // Total bars

// Cleanup
replay.stop()           // Restore original data
replay.destroy()        // Full cleanup
```

### Object Tree & Style Editor

```typescript
// Open Object Tree modal (lists all overlays)
chart.showObjectTree()

// Open Style Editor for a specific overlay
chart.showStyleEditor('overlay_id_123')
```

### Keyboard Shortcuts

```typescript
import { KeyboardShortcutManager } from 'klinecharts-pro'

const shortcuts = new KeyboardShortcutManager(containerElement)

shortcuts.register({ key: 'ctrl+z', description: 'Undo', callback: () => drawings.undo() })
shortcuts.register({ key: 'ctrl+y', description: 'Redo', callback: () => drawings.redo() })
shortcuts.register({ key: 'delete', callback: () => chart.removeOverlay() })
shortcuts.register({ key: 'escape', callback: () => chart.removeOverlay() })

// Disable during modals
shortcuts.setEnabled(false)
shortcuts.setEnabled(true)

shortcuts.destroy()
```

### Chart Templates

```typescript
import { ChartTemplateManager } from 'klinecharts-pro'

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
templates.getTemplateNames()                    // ['My Scalping Setup']
const tmpl = templates.loadTemplate('My Scalping Setup')

// Delete
templates.deleteTemplate('My Scalping Setup')
```

### Crosshair Sync

```typescript
import { CrosshairSyncManager } from 'klinecharts-pro'

const sync = new CrosshairSyncManager()

sync.addChart(chart1)
sync.addChart(chart2)
// Moving crosshair on chart1 now moves it on chart2 and vice versa

sync.removeChart(chart1)
sync.destroy()
```

### Custom Indicators & Overlays

```typescript
import { registerCustomIndicator, registerCustomOverlay } from 'klinecharts-pro'

// Register a custom indicator (auto-appears in Indicator menu)
registerCustomIndicator({
  template: { name: 'MyRSI', calc: (dataList) => { /* ... */ }, figures: [{ key: 'value', type: 'line' }] },
  label: 'My Custom RSI',
  paneType: 'sub'
})

// Register a custom overlay (auto-appears in Drawing menu)
registerCustomOverlay({
  template: { name: 'myTool', totalStep: 2, createPointFigures: (params) => { /* ... */ } },
  label: 'My Tool'
})
```

### Price Alerts

```typescript
chart.setAlert({ id: 'alert1', price: 150.00, condition: 'crosses_above', symbol: 'AAPL' })
chart.getAlerts()
chart.removeAlert('alert1')
```

### Multi-Symbol Comparison

```typescript
import { ComparisonManager } from 'klinecharts-pro'

const comparison = new ComparisonManager(chartWidget, datafeed)
await comparison.addSymbol({ ticker: 'MSFT' }, period, from, to)
comparison.getSymbols()
comparison.toggleVisibility('MSFT')
comparison.removeSymbol('MSFT')
comparison.destroy()
```

---

## 📊 DefaultDatafeed

```typescript
import { DefaultDatafeed } from 'klinecharts-pro'

// Uses Polygon.io API
const datafeed = new DefaultDatafeed('YOUR_API_KEY')
```

Implements the `Datafeed` interface:

```typescript
interface Datafeed {
  searchSymbols(search?: string): Promise<SymbolInfo[]>
  getHistoryKLineData(symbol: SymbolInfo, period: Period, from: number, to: number): Promise<KLineData[]>
  subscribe(symbol: SymbolInfo, period: Period, callback: DatafeedSubscribeCallback): void
  unsubscribe(symbol: SymbolInfo, period: Period): void
}
```

---

## 🏗 Architecture

```
src/
├── index.ts                    # Entry point + exports
├── KLineChartPro.tsx           # Main class (lifecycle, API)
├── ChartProComponent.tsx       # SolidJS component (all UI wiring)
├── types.ts                    # TypeScript interfaces
├── config.ts                   # Shared constants
├── registry.ts                 # Custom tool registry (auto-menu)
├── error.ts                    # Error handling system
├── store.ts                    # localStorage persistence
├── drawing-store.ts            # Undo/redo + drawing persistence
├── comparison.ts               # Multi-symbol comparison
├── bar-replay.ts               # Bar replay engine
├── keyboard-shortcuts.ts       # Keyboard shortcut manager
├── chart-template.ts           # Template save/load
├── crosshair-sync.ts           # Multi-chart crosshair sync
├── DefaultDatafeed.ts          # Polygon.io data feed
├── i18n/                       # 5 locale files (168+ keys each)
├── extension/                  # 25 overlay templates
│   ├── longPosition.ts         # Long Position tool
│   ├── shortPosition.ts        # Short Position tool
│   ├── frvp.ts                 # Volume Profile
│   ├── measure.ts              # Measure tool
│   ├── priceRange.ts           # Price Range zone
│   ├── textNote.ts             # Text annotation
│   ├── anchoredVwap.ts         # Anchored VWAP
│   ├── priceLabel.ts           # Price Label
│   └── ... (17 more)
├── widget/
│   ├── period-bar/             # Toolbar (periods, chart type, settings)
│   ├── drawing-bar/            # Drawing toolbar (8 groups)
│   ├── replay-bar/             # Replay controls (play/pause/step/speed)
│   ├── object-tree/            # Object manager modal
│   ├── drawing-style-editor/   # Style editor modal
│   ├── context-menu/           # Right-click menu
│   ├── error-banner/           # Error notification
│   ├── performance-panel/      # Debug panel
│   ├── alert-modal/            # Price alerts UI
│   └── ...
├── component/                  # Reusable UI (Modal, Select, List, etc.)
└── __tests__/                  # 38 unit tests (100% pass)
```

---

## 🧪 Testing

```bash
# Run all tests
npx vitest run

# Run with verbose output
npx vitest run --reporter=verbose

# Watch mode
npx vitest
```

Current status: **38/38 tests passing** ✅

---

## 🛠 Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build-core

# Run tests
npx vitest run
```

---

## 📄 License

Apache License 2.0
