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

import { createSignal, createEffect, onMount, Show, onCleanup, startTransition, Component, on, untrack } from 'solid-js'

import {
  init, dispose, utils, Nullable, Chart, OverlayMode, Styles,
  TooltipIconPosition, ActionType, PaneOptions, Indicator, DomPosition, FormatDateType
} from 'klinecharts'

// @ts-ignore
import lodashSet from 'lodash/set'
// @ts-ignore
import lodashClone from 'lodash/cloneDeep'

import { SelectDataSourceItem, Loading } from './component'
import { ChartStore } from './store'

import {
  PeriodBar, DrawingBar, IndicatorModal, TimezoneModal, SettingModal,
  ScreenshotModal, IndicatorSettingModal, SymbolSearchModal
} from './widget'

import ReplayBar from './widget/replay-bar'
import ReplayOverlay from './widget/replay-overlay'
import BottomBar from './widget/bottom-bar'
import ObjectTree from './widget/object-tree'
import type { OverlayItem } from './widget/object-tree'
import DrawingStyleEditor from './widget/drawing-style-editor'
import type { DrawingStyleValues } from './widget/drawing-style-editor'
import ContextMenu from './widget/context-menu'
import type { ContextMenuItem } from './widget/context-menu'
import { KeyboardShortcutManager } from './keyboard-shortcuts'
import { BarReplayManager } from './bar-replay'
import type { ReplayStatus } from './bar-replay'
import i18n from './i18n'

import { translateTimezone } from './widget/timezone-modal/data'

import { SymbolInfo, Period, ChartProOptions, ChartPro } from './types'

export interface ChartProComponentProps extends Required<Omit<ChartProOptions, 'container' | 'onSettingsChange' | 'onDrawingsChange'>> {
  ref: (chart: ChartPro) => void
  onSettingsChange?: (settings: any) => void
  onDrawingsChange?: (ticker: string, drawings: any[]) => void
}

interface PrevSymbolPeriod {
  symbol: SymbolInfo
  period: Period
}

function createIndicator (widget: Nullable<Chart>, indicatorName: string, isStack?: boolean, paneOptions?: PaneOptions, precision?: number): Nullable<string> {
  if (indicatorName === 'VOL') {
    paneOptions = { gap: { bottom: 2 }, ...paneOptions }
  }
  return widget?.createIndicator({
    name: indicatorName,
    precision,
    // @ts-expect-error
    createTooltipDataSource: ({ indicator, defaultStyles }) => {
      const icons = []
      if (indicator.visible) {
        icons.push(defaultStyles.tooltip.icons[1])
        icons.push(defaultStyles.tooltip.icons[2])
        icons.push(defaultStyles.tooltip.icons[3])
      } else {
        icons.push(defaultStyles.tooltip.icons[0])
        icons.push(defaultStyles.tooltip.icons[2])
        icons.push(defaultStyles.tooltip.icons[3])
      }
      return { icons }
    }
  }, isStack, paneOptions) ?? null
}

const ChartProComponent: Component<ChartProComponentProps> = props => {
  let widgetRef: HTMLDivElement | undefined = undefined
  let widget: Nullable<Chart> = null

  let priceUnitDom: HTMLElement
  const store = new ChartStore(props.persistence.enabled, props.persistence.prefix)

  let dataGeneration = 0  // Incremented on every symbol/period change to invalidate stale loadMore requests

  const [loading, setLoading] = createSignal(false)

  const [theme, setTheme] = createSignal(store.getTheme() ?? props.theme)
  const [styles, setStyles] = createSignal(store.getStyles() ?? props.styles)
  const [locale, setLocale] = createSignal(store.getLocale() ?? props.locale)

  const [symbol, setSymbol] = createSignal(store.getSymbol() ?? props.symbol)
  const [period, setPeriod] = createSignal(store.getPeriod() ?? props.period)
  const [indicatorModalVisible, setIndicatorModalVisible] = createSignal(false)
  const [mainIndicators, setMainIndicators] = createSignal(store.getMainIndicators() ?? [...(props.mainIndicators!)])
  const [subIndicators, setSubIndicators] = createSignal<Record<string, string>>(store.getSubIndicators() ?? {})

  const [timezoneModalVisible, setTimezoneModalVisible] = createSignal(false)
  const [timezone, setTimezone] = createSignal<SelectDataSourceItem>({ 
    key: store.getTimezone() ?? props.timezone, 
    text: translateTimezone(store.getTimezone() ?? props.timezone, store.getLocale() ?? props.locale) 
  })

  const [settingModalVisible, setSettingModalVisible] = createSignal(false)
  const [widgetDefaultStyles, setWidgetDefaultStyles] = createSignal<Styles>()

  const [screenshotUrl, setScreenshotUrl] = createSignal('')

  const [drawingBarVisible, setDrawingBarVisible] = createSignal(props.drawingBarVisible)

  const [symbolSearchModalVisible, setSymbolSearchModalVisible] = createSignal(false)

  const [loadingVisible, setLoadingVisible] = createSignal(false)

  const [indicatorSettingModalParams, setIndicatorSettingModalParams] = createSignal({
    visible: false, indicatorName: '', paneId: '', calcParams: [] as Array<any>
  })

  // --- New feature state ---
  const [chartType, setChartType] = createSignal('candle_solid')

  // Replay
  const [replayActive, setReplayActive] = createSignal(false)
  const [replaySelecting, setReplaySelecting] = createSignal(false)
  const [replayCrosshairX, setReplayCrosshairX] = createSignal(0)
  const [replayCrosshairVisible, setReplayCrosshairVisible] = createSignal(false)
  const [replayStatus, setReplayStatus] = createSignal<string>('idle')
  const [replayIndex, setReplayIndex] = createSignal(0)
  const [replayTotal, setReplayTotal] = createSignal(0)
  const [replaySpeed, setReplaySpeed] = createSignal(500)
  let replayManager: BarReplayManager | null = null
  let replaySelectCleanup: (() => void) | null = null

  // Object Tree
  const [objectTreeVisible, setObjectTreeVisible] = createSignal(false)
  const [overlayItems, setOverlayItems] = createSignal<OverlayItem[]>([])

  // Style Editor
  const [styleEditorVisible, setStyleEditorVisible] = createSignal(false)
  const [styleEditorOverlayId, setStyleEditorOverlayId] = createSignal('')
  const [styleEditorCurrentStyles, setStyleEditorCurrentStyles] = createSignal<any>({})

  // Context Menu
  const [contextMenuVisible, setContextMenuVisible] = createSignal(false)
  const [contextMenuX, setContextMenuX] = createSignal(0)
  const [contextMenuY, setContextMenuY] = createSignal(0)
  const [contextMenuOverlayId, setContextMenuOverlayId] = createSignal('')

  // Keyboard shortcuts
  let shortcutManager: KeyboardShortcutManager | null = null

  const saveDrawings = () => {
    try {
      if (!widget) return
      // Use internal store to get all overlays (Property access)
      const chartInstance = widget as any
      const overlayStore = chartInstance._chartStore?.getOverlayStore?.()
      if (overlayStore) {
        const overlays = overlayStore.getInstances?.() || []
        const drawings = overlays.map((o: any) => ({
          name: o.name,
          id: o.id,
          groupId: o.groupId,
          lock: o.lock,
          visible: o.visible !== false,
          points: o.points,
          styles: o.styles,
          extendData: o.extendData
        }))
        store.setDrawings(symbol().ticker, drawings)
        props.onDrawingsChange?.(symbol().ticker, drawings)
      }
    } catch (e) {
      console.warn('[ChartPro] Failed to save drawings:', e)
    }
  }

  const loadDrawings = () => {
    if (!widget) return
    const drawings = store.getDrawings(symbol().ticker)
    if (drawings) {
      drawings.forEach((d: any) => widget?.createOverlay(d))
    }
  }

  props.ref({
    setTheme,
    getTheme: () => theme(),
    setStyles,
    getStyles: () => widget!.getStyles(),
    setLocale,
    getLocale: () => locale(),
    setTimezone: (newTimezone: string) => { setTimezone({ key: newTimezone, text: translateTimezone(newTimezone, locale()) }) },
    getTimezone: () => timezone().key,
    setSymbol,
    getSymbol: () => symbol(),
    setPeriod,
    getPeriod: () => period(),
    setChartType: (type: string) => { setChartType(type); widget?.setStyles({ candle: { type: type as any } }) },
    getChartType: () => chartType(),
    startReplay: (dataSource: 'current' | 'custom') => startReplay(dataSource),
    stopReplay: () => { replayManager?.stop(); setReplayActive(false) },
    showObjectTree: () => { refreshOverlayItems(); setObjectTreeVisible(true) },
    showStyleEditor: (overlayId: string) => { setStyleEditorOverlayId(overlayId); setStyleEditorVisible(true) },
    getSettings: () => store.getAll(),
    setSettings: (settings: any) => {
      if (settings.theme) setTheme(settings.theme)
      if (settings.locale) setLocale(settings.locale)
      if (settings.timezone) setTimezone({ key: settings.timezone, text: translateTimezone(settings.timezone, settings.locale || locale()) })
      if (settings.symbol) setSymbol(settings.symbol)
      if (settings.period) setPeriod(settings.period)
      if (settings.mainIndicators) setMainIndicators(settings.mainIndicators)
      if (settings.subIndicators) setSubIndicators(settings.subIndicators)
    },
    getDrawings: (ticker: string) => store.getDrawings(ticker) ?? [],
    setDrawings: (ticker: string, drawings: any[]) => {
      store.setDrawings(ticker, drawings)
      if (ticker === symbol().ticker) {
        // clear existing overlays and recreate
        widget?.removeOverlay()
        drawings.forEach((d: any) => widget?.createOverlay(d))
      }
    }
  })

  const documentResize = () => {
    widget?.resize()
  }

  const adjustFromTo = (period: Period, toTimestamp: number, count: number) => {
    let to = toTimestamp
    let from = to
    switch (period.timespan) {
      case 'minute': {
        to = to - (to % (60 * 1000))
        from = to - count * period.multiplier * 60 * 1000
        break
      }
      case 'hour': {
        to = to - (to % (60 * 60 * 1000))
        from = to - count * period.multiplier * 60 * 60 * 1000
        break
      }
      case 'day': {
        to = to - (to % (24 * 60 * 60 * 1000))
        from = to - count * period.multiplier * 24 * 60 * 60 * 1000
        break
      }
      case 'week': {
        const date = new Date(to)
        const week = date.getDay()
        const dif = week === 0 ? 6 : week - 1
        to = to - dif * 24 * 60 * 60 * 1000
        const newDate = new Date(to)
        to = new Date(`${newDate.getFullYear()}-${newDate.getMonth() + 1}-${newDate.getDate()}`).getTime()
        from = to - count * period.multiplier * 7 * 24 * 60 * 60 * 1000
        break
      }
      case 'month': {
        const date = new Date(to)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        to = new Date(`${year}-${month}-01`).getTime()
        from = to - count * period.multiplier * 30 * 24 * 60 * 60 * 1000
        const fromDate = new Date(from)
        from = new Date(`${fromDate.getFullYear()}-${fromDate.getMonth() + 1}-01`).getTime()
        break
      }
      case 'year': {
        const date = new Date(to)
        const year = date.getFullYear()
        to = new Date(`${year}-01-01`).getTime()
        from = to - count * period.multiplier * 365 * 24 * 60 * 60 * 1000
        const fromDate = new Date(from)
        from = new Date(`${fromDate.getFullYear()}-01-01`).getTime()
        break
      }
    }
    return [from, to]
  }

  onMount(() => {
    window.addEventListener('resize', documentResize)
    widget = init(widgetRef!, {
      customApi: {
        formatDate: (dateTimeFormat: Intl.DateTimeFormat, timestamp, format: string, type: FormatDateType) => {
          const p = period()
          switch (p.timespan) {
            case 'minute': {
              if (type === FormatDateType.XAxis) {
                return utils.formatDate(dateTimeFormat, timestamp, 'HH:mm')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD HH:mm')
            }
            case 'hour': {
              if (type === FormatDateType.XAxis) {
                return utils.formatDate(dateTimeFormat, timestamp, 'MM-DD HH:mm')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD HH:mm')
            }
            case 'day':
            case 'week': return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD')
            case 'month': {
              if (type === FormatDateType.XAxis) {
                return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD')
            }
            case 'year': {
              if (type === FormatDateType.XAxis) {
                return utils.formatDate(dateTimeFormat, timestamp, 'YYYY')
              }
              return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD')
            }
          }
          return utils.formatDate(dateTimeFormat, timestamp, 'YYYY-MM-DD HH:mm')
        }
      }
    })

    // Store chart instance globally for overlays (e.g. FRVP) to access data
    ;(window as any)._klineChartInstance = widget

    if (widget) {
      const watermarkContainer = widget.getDom('candle_pane', DomPosition.Main)
      if (watermarkContainer) {
        let watermark = document.createElement('div')
        watermark.className = 'klinecharts-pro-watermark'
        if (utils.isString(props.watermark)) {
          const str = (props.watermark as string).replace(/(^\s*)|(\s*$)/g, '')
          watermark.innerHTML = str
        } else {
          watermark.appendChild(props.watermark as Node)
        }
        watermarkContainer.appendChild(watermark)
      }

      const priceUnitContainer = widget.getDom('candle_pane', DomPosition.YAxis)
      priceUnitDom = document.createElement('span')
      priceUnitDom.className = 'klinecharts-pro-price-unit'
      priceUnitContainer?.appendChild(priceUnitDom)
    }

    mainIndicators().forEach(indicator => {
      createIndicator(widget, indicator, true, { id: 'candle_pane' }, symbol().pricePrecision)
    })
    const storedSubIndicators = store.getSubIndicators()
    const subIndicatorNames = storedSubIndicators ? Object.keys(storedSubIndicators) : (props.subIndicators ?? [])
    const subIndicatorMap: Record<string, string> = {}
    subIndicatorNames.forEach(indicator => {
      const paneId = createIndicator(widget, indicator, true, undefined, symbol().volumePrecision)
      if (paneId) {
        subIndicatorMap[indicator] = paneId
      }
    })
    setSubIndicators(subIndicatorMap)
    widget?.loadMore(timestamp => {
      setLoading(true)
      const gen = dataGeneration  // Capture current generation
      const get = async () => {
        const p = period()
        const [to] = adjustFromTo(p, timestamp!, 1)
        const [from] = adjustFromTo(p, to, 500)
        const kLineDataList = (await props.datafeed.getHistoryKLineData(symbol(), p, from, to)).filter(d => d.close > 0)
        // Only apply if we're still on the same generation (symbol/period hasn't changed)
        if (gen === dataGeneration) {
          widget?.applyMoreData(kLineDataList, kLineDataList.length > 0)
        }
        setLoading(false)
      }
      get()
    })
    widget?.subscribeAction(ActionType.OnTooltipIconClick, (data) => {
      if (data.indicatorName) {
        switch (data.iconId) {
          case 'visible': {
            widget?.overrideIndicator({ name: data.indicatorName, visible: true }, data.paneId)
            break
          }
          case 'invisible': {
            widget?.overrideIndicator({ name: data.indicatorName, visible: false }, data.paneId)
            break
          }
          case 'setting': {
            const indicator = widget?.getIndicatorByPaneId(data.paneId, data.indicatorName) as Indicator
            setIndicatorSettingModalParams({
              visible: true, indicatorName: data.indicatorName, paneId: data.paneId, calcParams: indicator.calcParams
            })
            break
          }
          case 'close': {
            if (data.paneId === 'candle_pane') {
              const newMainIndicators = [...mainIndicators()]
              widget?.removeIndicator('candle_pane', data.indicatorName)
              newMainIndicators.splice(newMainIndicators.indexOf(data.indicatorName), 1)
              setMainIndicators(newMainIndicators)
            } else {
              const newIndicators = { ...subIndicators() }
              widget?.removeIndicator(data.paneId, data.indicatorName)
              delete (newIndicators as Record<string, string>)[data.indicatorName]
              setSubIndicators(newIndicators)
            }
            break
          }
        }
      }
    })

    // --- Mount keyboard shortcuts ---
    const container = (widgetRef as unknown as HTMLDivElement)?.parentElement
    if (container) {
      shortcutManager = new KeyboardShortcutManager(container as HTMLElement)
      shortcutManager.register({ key: 'escape', description: 'Cancel overlay', callback: () => widget?.removeOverlay() })
    }

    // --- Track overlay clicks for style editor ---
    widget?.subscribeAction(ActionType.OnCandleBarClick, (data: any) => {
      // When candle is clicked, clear active overlay
      setStyleEditorOverlayId('')
      saveDrawings()
    })

    widget?.subscribeAction(ActionType.OnPaneDrag, () => {
      saveDrawings()
    })

    loadDrawings()
  })

  onCleanup(() => {
    saveDrawings()
    window.removeEventListener('resize', documentResize)
    shortcutManager?.destroy()
    replaySelectCleanup?.()
    replayManager?.destroy()
    ;(window as any)._klineChartInstance = null
    dispose(widgetRef!)
  })

  createEffect(() => {
    const s = symbol()
    if (s?.priceCurrency) {
      priceUnitDom.innerHTML = s?.priceCurrency.toLocaleUpperCase()
      priceUnitDom.style.display = 'flex'
    } else {
      priceUnitDom.style.display = 'none'
    }
    widget?.setPriceVolumePrecision(s?.pricePrecision ?? 2, s?.volumePrecision ?? 0)
  })

  createEffect(on([symbol, period], (current, prev) => {
    const [s, p] = current
    const [prevS, prevP] = prev ?? []
    
    if (prevS && prevP) {
      props.datafeed.unsubscribe(prevS, prevP)
    }

    dataGeneration++  // Invalidate any pending loadMore requests
    setLoading(true)
    setLoadingVisible(true)
    
    const get = async () => {
      const [from, to] = adjustFromTo(p, new Date().getTime(), 500)
      const kLineDataList = (await props.datafeed.getHistoryKLineData(s, p, from, to)).filter(d => d.close > 0)
      
      // Use untrack to check current symbol/period without adding them as dependencies of the async part
      const currentS = untrack(symbol)
      const currentP = untrack(period)
      
      if (
        s.ticker === currentS.ticker &&
        p.timespan === currentP.timespan &&
        p.multiplier === currentP.multiplier
      ) {
        widget?.clearData()
        widget?.applyNewData(kLineDataList, kLineDataList.length > 0)
        props.datafeed.subscribe(s, p, data => {
          if (data.close > 0) {
            widget?.updateData(data)
          }
        })
      }
      setLoading(false)
      setLoadingVisible(false)
    }
    get()
  }, { defer: false }))

  createEffect(() => {
    const t = theme()
    widget?.setStyles(t)
    const color = t === 'dark' ? '#929AA5' : '#76808F'
    widget?.setStyles({
      indicator: {
        tooltip: {
          icons: [
            {
              id: 'visible',
              position: TooltipIconPosition.Middle,
              marginLeft: 8,
              marginTop: 7,
              marginRight: 0,
              marginBottom: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              icon: '\ue903',
              fontFamily: 'icomoon',
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            },
            {
              id: 'invisible',
              position: TooltipIconPosition.Middle,
              marginLeft: 8,
              marginTop: 7,
              marginRight: 0,
              marginBottom: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              icon: '\ue901',
              fontFamily: 'icomoon',
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            },
            {
              id: 'setting',
              position: TooltipIconPosition.Middle,
              marginLeft: 6,
              marginTop: 7,
              marginBottom: 0,
              marginRight: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              icon: '\ue902',
              fontFamily: 'icomoon',
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            },
            {
              id: 'close',
              position: TooltipIconPosition.Middle,
              marginLeft: 6,
              marginTop: 7,
              marginRight: 0,
              marginBottom: 0,
              paddingLeft: 0,
              paddingTop: 0,
              paddingRight: 0,
              paddingBottom: 0,
              icon: '\ue900',
              fontFamily: 'icomoon',
              size: 14,
              color: color,
              activeColor: color,
              backgroundColor: 'transparent',
              activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
            }
          ]
        }
      }
    })
  })

  createEffect(() => {
    widget?.setLocale(locale())
  })

  createEffect(() => {
    widget?.setTimezone(timezone().key)
  })

  createEffect(() => {
    if (styles()) {
      widget?.setStyles(styles())
      setWidgetDefaultStyles(lodashClone(widget!.getStyles()))
      store.setStyles(styles())
    }
  })

  // --- Persistence Effects ---
  createEffect(() => {
    store.setTheme(theme())
  })

  createEffect(() => {
    store.setLocale(locale())
  })

  createEffect(() => {
    store.setTimezone(timezone().key)
  })

  createEffect(() => {
    store.setSymbol(symbol())
  })

  createEffect(() => {
    store.setPeriod(period())
  })

  createEffect(() => {
    store.setMainIndicators(mainIndicators())
  })

  createEffect(() => {
    store.setSubIndicators(subIndicators())
  })

  // --- Trigger onSettingsChange when any setting changes ---
  createEffect(() => {
    // track dependencies
    theme(); timezone(); symbol(); period(); mainIndicators(); subIndicators();
    // Use timeout to ensure store has updated from other effects
    setTimeout(() => {
      props.onSettingsChange?.(store.getAll())
    }, 0)
  })

  // --- Drawing Persistence & Indicator Update: Handle Symbol Change ---
  createEffect(on(symbol, (s) => {
    if (!widget) return
    
    // Update precision for all active indicators to match the new symbol
    mainIndicators().forEach(name => {
      widget?.overrideIndicator({ name, precision: s.pricePrecision }, 'candle_pane')
    })
    
    Object.entries(subIndicators()).forEach(([name, paneId]) => {
      widget?.overrideIndicator({ name, precision: s.volumePrecision }, paneId)
    })

    // Clear existing overlays and load new ones for the selected symbol
    widget.removeOverlay()
    const drawings = store.getDrawings(s.ticker)
    if (drawings) {
      drawings.forEach((d: any) => widget?.createOverlay(d))
    }

    // Force a resize to recalculate Y-axis scales
    setTimeout(() => {
      widget?.resize()
    }, 50)
  }, { defer: true }))

  // --- Helper: collect overlay items for Object Tree ---
  const refreshOverlayItems = () => {
    if (!widget) return
    // Collect overlays by trying known ids — klinecharts getOverlayById requires an id
    // Use internal method to get all overlays
    const items: OverlayItem[] = []
    try {
      // Try to access chart's internal overlay store
      const chartInstance = widget as any
      const overlayStore = chartInstance._chartStore?.()?.getOverlayStore?.() ?? chartInstance.getOverlayStore?.()
      if (overlayStore) {
        const overlays = overlayStore.getInstances?.() ?? []
        overlays.forEach((o: any) => {
          items.push({ id: o.id, name: o.name, visible: o.visible !== false, groupId: o.groupId, paneId: o.paneId })
        })
      }
    } catch {
      // Fallback: empty list
    }
    setOverlayItems(items)
  }

  // --- Helper: enter replay selection mode ---
  let replayLastDataIndex = -1

  const enterReplaySelection = () => {
    if (!widget || replayActive()) return
    setReplaySelecting(true)
    setReplayCrosshairVisible(false)
    replayLastDataIndex = -1

    // Track crosshair position for vertical line preview
    const crosshairHandler = (data: any) => {
      if (data.x != null && data.x > 0) {
        setReplayCrosshairX(data.x)
        setReplayCrosshairVisible(true)
        // Store the dataIndex from crosshair for use on click
        if (data.dataIndex != null) {
          replayLastDataIndex = data.dataIndex
        }
      } else {
        setReplayCrosshairVisible(false)
      }
    }
    widget.subscribeAction(ActionType.OnCrosshairChange, crosshairHandler)

    // Handle click on candle to select start point
    const clickHandler = (data: any) => {
      if (!replaySelecting()) return
      const dataList = widget!.getDataList()
      if (!dataList || dataList.length === 0) return
      
      // Use dataIndex from the click event, or from the last crosshair position
      let dataIndex = data.dataIndex ?? replayLastDataIndex
      
      if (dataIndex == null || dataIndex < 0) {
        // Fallback: use the middle of the visible data
        dataIndex = Math.floor(dataList.length / 2)
      }

      // Clamp to valid range
      dataIndex = Math.max(0, Math.min(dataIndex, dataList.length - 1))

      // Clean up selection mode
      cancelReplaySelection()

      // Start replay from the selected index
      startReplayFromIndex(dataIndex)
    }
    widget.subscribeAction(ActionType.OnCandleBarClick, clickHandler)

    // Store cleanup
    replaySelectCleanup = () => {
      widget?.unsubscribeAction(ActionType.OnCrosshairChange, crosshairHandler)
      widget?.unsubscribeAction(ActionType.OnCandleBarClick, clickHandler)
    }
  }

  const cancelReplaySelection = () => {
    replaySelectCleanup?.()
    replaySelectCleanup = null
    setReplaySelecting(false)
    setReplayCrosshairVisible(false)
  }

  const startReplayFromIndex = (startIndex: number) => {
    if (!widget) return
    replayManager = new BarReplayManager(widget, props.datafeed)
    replayManager.setHandlers({
      onStep: (index, total) => { setReplayIndex(index); setReplayTotal(total) },
      onStatusChange: (status) => setReplayStatus(status),
      onEnd: () => setReplayStatus('ended')
    })
    replayManager.start({ dataSource: 'current', speed: replaySpeed(), startFrom: startIndex }).then(() => {
      setReplayActive(true)
      setReplayTotal(replayManager!.getTotal())
      setReplayIndex(replayManager!.getIndex())
    })
  }

  // --- Helper: start replay (API — backward compatible) ---
  const startReplay = (dataSource: 'current' | 'custom') => {
    if (dataSource === 'current') {
      enterReplaySelection()
    }
  }

  // --- Helper: go to date ---
  const gotoDate = (timestamp: number) => {
    if (!widget) return
    console.log(`[gotoDate] Target timestamp: ${timestamp} (${new Date(timestamp).toLocaleString()})`)
    
    // First try native scrollToTimestamp
    widget.scrollToTimestamp(timestamp, 300)
    
    // Fallback/Verify: Find closest index and ensure it's visible
    const dataList = widget.getDataList()
    if (dataList && dataList.length > 0) {
      // Find closest bar
      let closestIdx = 0
      let minDiff = Infinity
      for (let i = 0; i < dataList.length; i++) {
        const diff = Math.abs(dataList[i].timestamp - timestamp)
        if (diff < minDiff) {
          minDiff = diff
          closestIdx = i
        }
      }
      
      console.log(`[gotoDate] Closest bar index: ${closestIdx}, time: ${new Date(dataList[closestIdx].timestamp).toLocaleString()}`)
      
      // If the target date is completely out of range (not loaded), log a warning
      if (timestamp < dataList[0].timestamp) {
        console.warn('[gotoDate] Target date is BEFORE the earliest loaded data. Please scroll back to load more history first.')
      }
      
      // Scroll to that index explicitly (centers it or brings it into view)
      widget.scrollToDataIndex(closestIdx, 300)
    }
  }

  return (
    <>
      <i class="icon-close klinecharts-pro-load-icon"/>
      <Show when={symbolSearchModalVisible()}>
        <SymbolSearchModal
          locale={props.locale}
          datafeed={props.datafeed}
          onSymbolSelected={symbol => { setSymbol(symbol) }}
          onClose={() => { setSymbolSearchModalVisible(false) }}/>
      </Show>
      <Show when={indicatorModalVisible()}>
        <IndicatorModal
          locale={props.locale}
          mainIndicators={mainIndicators()}
          subIndicators={subIndicators()}
          onClose={() => { setIndicatorModalVisible(false) }}
          onMainIndicatorChange={data => {
            const newMainIndicators = [...mainIndicators()]
            if (data.added) {
              createIndicator(widget, data.name, true, { id: 'candle_pane' }, symbol().pricePrecision)
              newMainIndicators.push(data.name)
            } else {
              widget?.removeIndicator('candle_pane', data.name)
              newMainIndicators.splice(newMainIndicators.indexOf(data.name), 1)
            }
            setMainIndicators(newMainIndicators)
          }}
          onSubIndicatorChange={data => {
            const newSubIndicators: Record<string, string> = { ...subIndicators() }
            if (data.added) {
              const paneId = createIndicator(widget, data.name, true, undefined, symbol().volumePrecision)
              if (paneId) {
                newSubIndicators[data.name] = paneId
              }
            } else {
              if (data.paneId) {
                widget?.removeIndicator(data.paneId, data.name)
                delete newSubIndicators[data.name]
              }
            }
            setSubIndicators(newSubIndicators)
          }}/>
      </Show>
      <Show when={timezoneModalVisible()}>
        <TimezoneModal
          locale={props.locale}
          timezone={timezone()}
          onClose={() => { setTimezoneModalVisible(false) }}
          onConfirm={setTimezone}
        />
      </Show>
      <Show when={settingModalVisible()}>
        <SettingModal
          locale={props.locale}
          currentStyles={utils.clone(widget!.getStyles())}
          onClose={() => { setSettingModalVisible(false) }}
          onChange={style => {
            widget?.setStyles(style)
          }}
          onRestoreDefault={(options: SelectDataSourceItem[]) => {
            const style = {}
            options.forEach(option => {
              const key = option.key
              lodashSet(style, key, utils.formatValue(widgetDefaultStyles(), key))
            })
            widget?.setStyles(style)
          }}
        />
      </Show>
      <Show when={screenshotUrl().length > 0}>
        <ScreenshotModal
          locale={props.locale}
          url={screenshotUrl()}
          onClose={() => { setScreenshotUrl('') }}
        />
      </Show>
      <Show when={indicatorSettingModalParams().visible}>
        <IndicatorSettingModal
          locale={props.locale}
          params={indicatorSettingModalParams()}
          onClose={() => { setIndicatorSettingModalParams({ visible: false, indicatorName: '', paneId: '', calcParams: [] }) }}
          onConfirm={(params)=> {
            const modalParams = indicatorSettingModalParams()
            widget?.overrideIndicator({ name: modalParams.indicatorName, calcParams: params }, modalParams.paneId)
          }}
        />
      </Show>
      {/* Context Menu */}
      <Show when={contextMenuVisible()}>
        <ContextMenu
          x={contextMenuX()}
          y={contextMenuY()}
          items={[
            { key: 'edit_style', label: i18n('edit_style', props.locale), icon: '🎨' },
            { key: 'hide', label: i18n('hide', props.locale), icon: '👁' },
            { key: 'delete', label: i18n('delete', props.locale), icon: '🗑', danger: true }
          ]}
          onSelect={(key) => {
            const id = contextMenuOverlayId()
            if (key === 'edit_style') {
              setStyleEditorOverlayId(id)
              setStyleEditorCurrentStyles({})
              setStyleEditorVisible(true)
            } else if (key === 'hide') {
              widget?.overrideOverlay({ id, visible: false })
            } else if (key === 'delete') {
              widget?.removeOverlay({ id })
            }
            setContextMenuVisible(false)
          }}
          onClose={() => setContextMenuVisible(false)}
        />
      </Show>
      {/* Object Tree Modal */}
      <Show when={objectTreeVisible()}>
        <ObjectTree
          locale={props.locale}
          overlays={overlayItems()}
          onToggleVisibility={(id, visible) => { widget?.overrideOverlay({ id, visible }) }}
          onRemove={(id) => { widget?.removeOverlay({ id }); refreshOverlayItems() }}
          onSelect={(id) => { /* future: highlight selected overlay */ }}
          onClose={() => setObjectTreeVisible(false)}
        />
      </Show>
      {/* Drawing Style Editor */}
      <Show when={styleEditorVisible()}>
        <DrawingStyleEditor
          locale={props.locale}
          overlayId={styleEditorOverlayId()}
          currentStyles={styleEditorCurrentStyles()}
          onApply={(id, styles) => {
            widget?.overrideOverlay({
              id,
              styles: {
                line: { color: styles.lineColor, size: styles.lineWidth, style: styles.lineStyle },
                polygon: { color: styles.lineColor, borderColor: styles.lineColor, borderSize: styles.lineWidth, borderStyle: styles.lineStyle }
              } as any
            })
          }}
          onClose={() => setStyleEditorVisible(false)}
        />
      </Show>
      <PeriodBar
        locale={props.locale}
        symbol={symbol()}
        spread={drawingBarVisible()}
        period={period()}
        periods={props.periods}
        chartType={chartType()}
        onMenuClick={() => {
          setDrawingBarVisible(!drawingBarVisible())
          setTimeout(() => {
            widget?.resize()
          }, 50)
        }}
        onSymbolClick={() => { setSymbolSearchModalVisible(!symbolSearchModalVisible()) }}
        onPeriodChange={setPeriod}
        onChartTypeChange={(type) => {
          setChartType(type)
          widget?.setStyles({ candle: { type: type as any } })
        }}
        onIndicatorClick={() => { setIndicatorModalVisible((visible => !visible)) }}
        onTimezoneClick={() => { setTimezoneModalVisible((visible => !visible)) }}
        onSettingClick={() => { setSettingModalVisible((visible => !visible)) }}
        onScreenshotClick={() => {
          if (widget) {
            const url = widget.getConvertPictureUrl(true, 'jpeg', props.theme === 'dark' ? '#151517' : '#ffffff')
            setScreenshotUrl(url)
          }
        }}
        onReplayClick={() => enterReplaySelection()}
      />
      <div
        class="klinecharts-pro-content">
        <Show when={loadingVisible()}>
          <Loading/>
        </Show>
        <Show when={drawingBarVisible()}>
          <DrawingBar
            locale={props.locale}
            onDrawingItemClick={overlay => { 
              widget?.createOverlay(overlay)
              saveDrawings()
            }}
            onModeChange={mode => { widget?.overrideOverlay({ mode: mode as OverlayMode }) }}
            onLockChange={lock => { widget?.overrideOverlay({ lock }) }}
            onVisibleChange={visible => { widget?.overrideOverlay({ visible }) }}
            onRemoveClick={(groupId) => { 
              widget?.removeOverlay({ groupId })
              saveDrawings()
            }}/>
        </Show>
        <div
          ref={widgetRef}
          class='klinecharts-pro-widget'
          style={replaySelecting() ? { cursor: 'crosshair' } : {}}
          data-drawing-bar-visible={drawingBarVisible()}
          onContextMenu={(e: MouseEvent) => {
            // Right-click on chart: if an overlay is nearby, show context menu
            e.preventDefault()
            setContextMenuX(e.clientX)
            setContextMenuY(e.clientY)
            // Check if there's a selected overlay
            const overlayId = styleEditorOverlayId()
            if (overlayId) {
              setContextMenuOverlayId(overlayId)
              setContextMenuVisible(true)
            }
          }}
        />
        {/* Replay Selection Overlay */}
        <Show when={replaySelecting()}>
          <ReplayOverlay
            locale={props.locale}
            crosshairX={replayCrosshairX()}
            crosshairVisible={replayCrosshairVisible()}
            onCancel={() => cancelReplaySelection()}
          />
        </Show>
      </div>
      {/* Replay Bar */}
      <Show when={replayActive()}>
        <ReplayBar
          locale={props.locale}
          status={replayStatus()}
          index={replayIndex()}
          total={replayTotal()}
          speed={replaySpeed()}
          onPlay={() => replayManager?.play()}
          onPause={() => replayManager?.pause()}
          onStepForward={() => replayManager?.stepForward()}
          onStepBackward={() => replayManager?.stepBackward()}
          onSpeedChange={(speed) => { setReplaySpeed(speed); replayManager?.setSpeed(speed) }}
          onSeek={(index) => replayManager?.seekTo(index)}
          onExit={() => { replayManager?.stop(); setReplayActive(false) }}
        />
      </Show>
      {/* Bottom Status Bar */}
      <BottomBar
        locale={props.locale}
        timezone={timezone().key}
        onGotoDate={gotoDate}
        onTimezoneClick={() => { setTimezoneModalVisible(v => !v) }}
      />
    </>
  )
}

export default ChartProComponent