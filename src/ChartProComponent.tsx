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

import { createSignal, createEffect, onMount, Show, onCleanup, startTransition, Component, on, untrack, For } from 'solid-js'

import {
  init, dispose, utils, Nullable, Chart, OverlayMode, Styles,
  TooltipIconPosition, ActionType, PaneOptions, Indicator, DomPosition, FormatDateType,
  registerIndicator
} from 'klinecharts'

// @ts-ignore
import lodashSet from 'lodash/set'
// @ts-ignore
import lodashClone from 'lodash/cloneDeep'

import { SelectDataSourceItem, Loading } from './component'
import { ChartStore } from './store'

import { PeriodBar, DrawingBar } from './widget'
import ChartModals from './widget/chart-modals'

import ReplayBar from './widget/replay-bar'
import ReplayOverlay from './widget/replay-overlay'
import BottomBar from './widget/bottom-bar'
import ObjectTree from './widget/object-tree'
import type { OverlayItem } from './widget/object-tree'
import DrawingStyleEditor from './widget/drawing-style-editor'
import type { DrawingStyleValues } from './widget/drawing-style-editor'
import ContextMenu from './widget/context-menu'
import type { ContextMenuItem } from './widget/context-menu'
import { handleContextMenuAction } from './widget/context-menu/ContextMenuHandler'
import AlertModal, { evaluateAlerts } from './widget/alert-modal'
import PerformancePanel from './widget/performance-panel'
import TemplateModal from './widget/template-modal'
import { ComparisonManager } from './comparison'
import { ChartTemplateManager } from './chart-template'
import { KeyboardShortcutManager } from './keyboard-shortcuts'
import { useReplayManager } from './widget/replay-bar/useReplayManager'
import i18n from './i18n'
import { useChartData, adjustFromTo } from './hooks/useChartData'

import { translateTimezone } from './widget/timezone-modal/data'
import { createPinePlugin } from '@simahfud/pine-to-kline'
import { customRegistry } from './registry'

import { SymbolInfo, Period, ChartProOptions, ChartPro } from './types'

export interface ChartProComponentProps extends Required<Omit<ChartProOptions, 'container' | 'onSettingsChange' | 'onDrawingsChange' | 'onLayoutClick' | 'chartType' | 'renkoBrickSize' | 'rangeBarSize'>> {
  ref: (chart: ChartPro) => void
  onSettingsChange?: (settings: any) => void
  onDrawingsChange?: (ticker: string, drawings: any[]) => void
  onLayoutClick?: () => void
  chartType?: string
  renkoBrickSize?: number
  rangeBarSize?: number
}

interface PrevSymbolPeriod {
  symbol: SymbolInfo
  period: Period
}

function createIndicator (widget: Nullable<Chart>, indicatorName: string, isStack?: boolean, paneOptions?: PaneOptions, precision?: number, calcParams?: any[]): Nullable<string> {
  if (indicatorName === 'VOL') {
    paneOptions = { gap: { bottom: 2 }, ...paneOptions }
  }
  const indicatorConfig: any = {
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
  }
  if (calcParams && calcParams.length > 0) {
    indicatorConfig.calcParams = calcParams
  }
  return widget?.createIndicator(indicatorConfig, isStack, paneOptions) ?? null
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
  const [symbolSearchMode, setSymbolSearchMode] = createSignal<'main' | 'compare'>('main')

  const [loadingVisible, setLoadingVisible] = createSignal(false)

  const [indicatorSettingModalParams, setIndicatorSettingModalParams] = createSignal({
    visible: false, indicatorName: '', paneId: '', calcParams: [] as Array<any>
  })

  const [chartTypeSettingsVisible, setChartTypeSettingsVisible] = createSignal(false)

  // New features states
  const [alertModalVisible, setAlertModalVisible] = createSignal(false)
  const [alerts, setAlerts] = createSignal<any[]>([])
  let previousPriceRef = 0

  const [performancePanelVisible, setPerformancePanelVisible] = createSignal(false)
  const [dataPointCount, setDataPointCount] = createSignal(0)
  
  let comparisonManager: ComparisonManager | null = null
  const [comparisonSymbols, setComparisonSymbols] = createSignal<any[]>([])

  const chartTemplateManager = new ChartTemplateManager(store)
  const [templateModalVisible, setTemplateModalVisible] = createSignal(false)
  const [templates, setTemplates] = createSignal<any[]>(chartTemplateManager.getTemplates())

  // Pine Script Integration
  const [pineEditorVisible, setPineEditorVisible] = createSignal(false)
  const [pineEditorInitialCode, setPineEditorInitialCode] = createSignal<string | undefined>(undefined)
  const pineAPI = createPinePlugin()

  const handlePineEditorApply = async (code: string) => {
    try {
      const result = await pineAPI.compile(code)
      if (!result.success) {
        throw result.errors[0]
      }
      
      // Register into klinecharts core
      registerIndicator(result.indicatorConfig as any)

      // Save script to store
      store.addCustomScript(result.name, code)
      
      // Add to customRegistry
      customRegistry.addIndicator({
        name: result.name,
        label: result.name,
        paneType: result.indicatorConfig.series === 'price' ? 'main' : 'sub'
      })
      
      // Add to chart
      if (result.indicatorConfig.series === 'price') {
        const newMainIndicators = [...mainIndicators()]
        if (!newMainIndicators.includes(result.name)) {
          newMainIndicators.push(result.name)
          setMainIndicators(newMainIndicators)
        } else {
          // Remove old instance to refresh it
          widget?.removeIndicator('candle_pane', result.name)
        }
        createIndicator(widget, result.name, true, { id: 'candle_pane' }, symbol().pricePrecision)
      } else {
        const newSubIndicators = { ...subIndicators() }
        if (!newSubIndicators[result.name]) {
          const paneId = createIndicator(widget, result.name, true, undefined, symbol().volumePrecision)
          if (paneId) {
            newSubIndicators[result.name] = paneId
            setSubIndicators(newSubIndicators)
          }
        } else {
          // Remove old instance and refresh it in the same pane
          const paneId = newSubIndicators[result.name]
          widget?.removeIndicator(paneId, result.name)
          createIndicator(widget, result.name, true, { id: paneId }, symbol().volumePrecision)
        }
      }
    } catch (e: any) {
      alert(`Pine Script Error:\n\n${e.message}`)
    }
  }

  const handleDeleteCustomIndicator = (name: string) => {
    store.removeCustomScript(name)
    customRegistry.removeIndicator(name)

    // Remove from chart if active
    if (mainIndicators().includes(name)) {
      widget?.removeIndicator('candle_pane', name)
      setMainIndicators(mainIndicators().filter(i => i !== name))
    }
    if (subIndicators()[name]) {
      widget?.removeIndicator(subIndicators()[name], name)
      const newSub = { ...subIndicators() }
      delete newSub[name]
      setSubIndicators(newSub)
    }
  }

  const handleEditCustomIndicator = (name: string) => {
    const scripts = store.getCustomScripts()
    if (scripts[name]) {
      setPineEditorInitialCode(scripts[name])
      setPineEditorVisible(true)
    }
  }

  // Datafeed and Chart Type Hook
  const {
    chartType,
    setChartType,
    renkoBrickSize,
    rangeBarSize,
    autoSizeValue,
    handleChartTypeSizeChange,
    setupLoadMore
  } = useChartData({
    getWidget: () => widget,
    datafeed: props.datafeed,
    symbol,
    period,
    setLoading,
    setLoadingVisible,
    store,
    initialChartType: props.chartType,
    initialRenkoBrickSize: props.renkoBrickSize,
    initialRangeBarSize: props.rangeBarSize,
    onDataUpdate: (data) => {
      // Evaluate alerts
      if (previousPriceRef > 0) {
        const triggeredIds = evaluateAlerts(alerts(), data.close, previousPriceRef)
        if (triggeredIds.length > 0) {
          // Re-render alerts list to show triggered status
          setAlerts([...alerts()])
        }
      }
      previousPriceRef = data.close
      
      // Update data point count for performance panel
      if (performancePanelVisible()) {
        setDataPointCount(widget?.getDataList()?.length || 0)
      }
    }
  })

  // Replay
  const {
    replayActive,
    replaySelecting,
    replayCrosshairX,
    replayCrosshairVisible,
    replayStatus,
    replayIndex,
    replayTotal,
    replaySpeed,
    setReplaySpeed,
    getReplayManager,
    enterReplaySelection,
    cancelReplaySelection,
    startReplay,
    stopReplay
  } = useReplayManager(() => widget, props.datafeed)

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
  const [contextMenuPrice, setContextMenuPrice] = createSignal(0)
  const [contextMenuOverlayId, setContextMenuOverlayId] = createSignal('')
  const [contextMenuMode, setContextMenuMode] = createSignal<'overlay' | 'chart'>('chart')
  const [gridVisible, setGridVisible] = createSignal(true)

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
      drawings.forEach((d: any) => createOverlayWithMenu(d))
    }
  }

  // Helper: create overlay with right-click context menu (prevents default delete)
  const createOverlayWithMenu = (overlayConfig: any) => {
    return widget?.createOverlay({
      ...overlayConfig,
      onRightClick: (event: any) => {
        // Set the overlay as active for context menu
        setStyleEditorOverlayId(event.overlay.id)
        setContextMenuOverlayId(event.overlay.id)
        setContextMenuMode('overlay')
        // Position will be set by the DOM contextmenu handler
        return true // Returning true prevents klinecharts from deleting the overlay
      },
      onSelected: (event: any) => {
        setStyleEditorOverlayId(event.overlay.id)
        return false
      }
    })
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
    setChartType: (type: string) => { setChartType(type) },
    getChartType: () => chartType(),
    startReplay: (dataSource: 'current' | 'custom') => startReplay(dataSource),
    stopReplay: () => { getReplayManager()?.stop(); },
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
        drawings.forEach((d: any) => createOverlayWithMenu(d))
      }
    },
    getWidget: () => widget
  })

  const documentResize = () => {
    widget?.resize()
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

    // --- Load Custom Scripts ---
    const customScripts = store.getCustomScripts()
    Object.keys(customScripts).forEach(async name => {
      try {
        const script = customScripts[name]
        const result = await pineAPI.compile(script)
        if (result.success) {
          registerIndicator(result.indicatorConfig as any)
          customRegistry.addIndicator({
            name: result.name,
            label: result.name,
            paneType: result.indicatorConfig.series === 'price' ? 'main' : 'sub'
          })
        }
      } catch (e) {
        console.warn(`[ChartPro] Failed to compile custom script ${name}:`, e)
      }
    })

    const savedCalcParams = store.getIndicatorCalcParams()
    mainIndicators().forEach(indicator => {
      createIndicator(widget, indicator, true, { id: 'candle_pane' }, symbol().pricePrecision, savedCalcParams[indicator])
    })
    const storedSubIndicators = store.getSubIndicators()
    const subIndicatorNames = storedSubIndicators ? Object.keys(storedSubIndicators) : (props.subIndicators ?? [])
    const subIndicatorMap: Record<string, string> = {}
    subIndicatorNames.forEach(indicator => {
      const paneId = createIndicator(widget, indicator, true, undefined, symbol().volumePrecision, savedCalcParams[indicator])
      if (paneId) {
        subIndicatorMap[indicator] = paneId
      }
    })
    setSubIndicators(subIndicatorMap)
    setupLoadMore()
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
              visible: true, indicatorName: data.indicatorName, paneId: data.paneId, calcParams: indicator.calcParams, extendData: (indicator as any).extendData
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
            store.removeIndicatorCalcParam(data.indicatorName)
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
      shortcutManager.register({ key: 'delete', description: 'Delete selected overlay', callback: () => {
        const overlayId = styleEditorOverlayId()
        if (overlayId) {
          widget?.removeOverlay({ id: overlayId })
          setStyleEditorOverlayId('')
          saveDrawings()
        }
      }})
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

    // Initialize Comparison Manager
    comparisonManager = new ComparisonManager(widget, props.datafeed)
    comparisonManager.setOnChange(() => {
      setComparisonSymbols(comparisonManager!.getSymbols())
    })

    loadDrawings()
  })

  onCleanup(() => {
    saveDrawings()
    window.removeEventListener('resize', documentResize)
    shortcutManager?.destroy()
    comparisonManager?.destroy()
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

  // --- Chart Type Persistence ---
  createEffect(() => {
    store.setChartType(chartType())
  })

  createEffect(() => {
    store.setRenkoBrickSize(renkoBrickSize())
  })

  createEffect(() => {
    store.setRangeBarSize(rangeBarSize())
  })

  // --- Trigger onSettingsChange when any setting changes ---
  createEffect(() => {
    // track dependencies
    theme(); timezone(); symbol(); period(); mainIndicators(); subIndicators(); chartType();
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
      drawings.forEach((d: any) => createOverlayWithMenu(d))
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
      <ChartModals
        locale={props.locale}
        chartTypeSettingsVisible={chartTypeSettingsVisible()}
        chartType={chartType()}
        renkoBrickSize={renkoBrickSize()}
        rangeBarSize={rangeBarSize()}
        autoSizeValue={autoSizeValue()}
        onChartTypeSettingsClose={() => setChartTypeSettingsVisible(false)}
        onChartTypeSizeConfirm={(size) => handleChartTypeSizeChange(size)}
        symbolSearchModalVisible={symbolSearchModalVisible()}
        datafeed={props.datafeed}
        onSymbolSearchClose={() => setSymbolSearchModalVisible(false)}
        onSymbolSelected={(sym) => {
          if (symbolSearchMode() === 'main') {
            setSymbol(sym)
          } else {
            const p = period()
            const now = new Date().getTime()
            const [from, to] = adjustFromTo(p, now, 500)
            comparisonManager?.addSymbol(sym, p, from, to)
          }
        }}
        indicatorModalVisible={indicatorModalVisible()}
        mainIndicators={mainIndicators()}
        subIndicators={subIndicators()}
        onIndicatorModalClose={() => setIndicatorModalVisible(false)}
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
        }}
        timezoneModalVisible={timezoneModalVisible()}
        timezone={timezone()}
        onTimezoneModalClose={() => setTimezoneModalVisible(false)}
        onTimezoneConfirm={setTimezone}
        settingModalVisible={settingModalVisible()}
        currentStyles={utils.clone(widget!.getStyles())}
        onSettingModalClose={() => setSettingModalVisible(false)}
        onSettingChange={styles => {
          setStyles(styles)
        }}
        onSettingRestoreDefault={options => {
          const styles: any = {}
          options.forEach(option => {
            const key = option.key
            lodashSet(styles, key, utils.formatValue(widgetDefaultStyles(), key))
          })
          setStyles(styles)
        }}
        screenshotUrl={screenshotUrl()}
        onScreenshotClose={() => setScreenshotUrl('')}
        indicatorSettingModalParams={indicatorSettingModalParams()}
        onIndicatorSettingModalClose={() => {
          setIndicatorSettingModalParams({ visible: false, indicatorName: '', paneId: '', calcParams: [], extendData: undefined })
        }}
        onIndicatorSettingConfirm={(params) => {
          const indName = indicatorSettingModalParams().indicatorName
          widget?.overrideIndicator({ name: indName, calcParams: params }, indicatorSettingModalParams().paneId)
          store.setIndicatorCalcParam(indName, params)
        }}
        pineEditorVisible={pineEditorVisible()}
        pineEditorInitialCode={pineEditorInitialCode()}
        onPineEditorClose={() => {
          setPineEditorVisible(false)
          setPineEditorInitialCode(undefined)
        }}
        onPineEditorApply={handlePineEditorApply}
        onDeleteCustomIndicator={handleDeleteCustomIndicator}
        onEditCustomIndicator={handleEditCustomIndicator}
      />
      {/* Context Menu */}
      <Show when={contextMenuVisible()}>
        <ContextMenu
          x={contextMenuX()}
          y={contextMenuY()}
          items={contextMenuMode() === 'overlay'
            ? [
                { key: 'edit_style', label: i18n('edit_style', props.locale), icon: '🎨' },
                { key: 'lock', label: i18n((() => {
                    try {
                      const overlayStore = (widget as any)?._chartStore?.()?.getOverlayStore?.()
                      const overlays = overlayStore?.getInstances?.() ?? []
                      const o = overlays.find((ov: any) => ov.id === contextMenuOverlayId())
                      return o?.lock ? 'unlock_drawing' : 'lock_drawing'
                    } catch { return 'lock_drawing' }
                  })(), props.locale), icon: (() => {
                    try {
                      const overlayStore = (widget as any)?._chartStore?.()?.getOverlayStore?.()
                      const overlays = overlayStore?.getInstances?.() ?? []
                      const o = overlays.find((ov: any) => ov.id === contextMenuOverlayId())
                      return o?.lock ? '🔓' : '🔒'
                    } catch { return '🔒' }
                  })() },
                { key: 'hide', label: i18n('hide', props.locale), icon: '👁' },
                { key: 'sep1', label: '', separator: true },
                { key: 'delete', label: i18n('delete', props.locale), icon: '🗑', danger: true }
              ]
            : [
                { key: 'add_indicator', label: i18n('add_indicator', props.locale), icon: '📊' },
                { key: 'chart_settings', label: i18n('chart_settings', props.locale), icon: '⚙️' },
                { key: 'add_alert', label: i18n('price_alert', props.locale), icon: '🔔' },
                { key: 'screenshot', label: i18n('screenshot', props.locale), icon: '📸' },
                { key: 'sep1', label: '', separator: true },
                { key: 'toggle_grid', label: i18n(gridVisible() ? 'hide_grid' : 'show_grid', props.locale), icon: gridVisible() ? '▦' : '▢' },
                { key: 'toggle_perf', label: 'Performance Panel', icon: '📈' },
                { key: 'goto_date', label: i18n('goto_date', props.locale), icon: '📅' },
                { key: 'go_to_latest', label: i18n('go_to_latest', props.locale), icon: '🏠' },
                { key: 'sep2', label: '', separator: true },
                { key: 'fullscreen', label: i18n('full_screen', props.locale), icon: '⛶' },
                { key: 'sep3', label: '', separator: true },
                { key: 'remove_all_drawings', label: i18n('remove_all_drawings', props.locale), icon: '🧹', danger: true }
              ]
          }
          onSelect={(key) => {
            const id = contextMenuOverlayId()
            handleContextMenuAction({
              key,
              overlayId: id,
              widget,
              widgetRef,
              theme: props.theme,
              gridVisible: gridVisible(),
              setGridVisible,
              setStyleEditorOverlayId,
              setStyleEditorCurrentStyles,
              setStyleEditorVisible,
              setIndicatorModalVisible,
              setSettingModalVisible,
              setScreenshotUrl,
              setContextMenuVisible,
              saveDrawings,
              setAlertModalVisible,
              setPerformancePanelVisible,
              performancePanelVisible: performancePanelVisible()
            })
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
                polygon: { style: 'stroke_fill', color: styles.fillColor, borderColor: styles.lineColor, borderSize: styles.lineWidth, borderStyle: styles.lineStyle },
                rect: { style: 'stroke_fill', color: styles.fillColor, borderColor: styles.lineColor, borderSize: styles.lineWidth, borderStyle: styles.lineStyle },
                circle: { style: 'stroke_fill', color: styles.fillColor, borderColor: styles.lineColor, borderSize: styles.lineWidth, borderStyle: styles.lineStyle },
                arc: { color: styles.lineColor, size: styles.lineWidth, style: styles.lineStyle },
                text: { color: styles.lineColor }
              } as any
            })
            saveDrawings()
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
        onSymbolClick={() => { 
          setSymbolSearchMode('main')
          setSymbolSearchModalVisible(!symbolSearchModalVisible()) 
        }}
        onCompareClick={() => {
          setSymbolSearchMode('compare')
          setSymbolSearchModalVisible(true)
        }}
        onTemplateClick={() => {
          setTemplates(chartTemplateManager.getTemplates())
          setTemplateModalVisible(true)
        }}
        onLayoutClick={() => {
          if (props.onLayoutClick) {
            props.onLayoutClick()
          } else {
            console.info('[klinecharts-pro] Layout: To use multi-chart layout, pass an onLayoutClick callback to ChartProOptions.')
          }
        }}
        onPeriodChange={setPeriod}
        onChartTypeChange={setChartType}
        onChartTypeSettingsClick={() => setChartTypeSettingsVisible(true)}
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
              createOverlayWithMenu(overlay)
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
            e.preventDefault()
            setContextMenuX(e.clientX)
            setContextMenuY(e.clientY)
            // Convert mouse Y to price at cursor position
            try {
              const rect = (widgetRef as unknown as HTMLDivElement)?.getBoundingClientRect()
              if (rect && widget) {
                const relativeY = e.clientY - rect.top
                const coords = (widget as any).convertFromPixel([{ y: relativeY }], { paneId: 'candle_pane' })
                const firstCoord = Array.isArray(coords) ? coords[0] : coords
                if (firstCoord && typeof firstCoord.value === 'number') {
                  setContextMenuPrice(firstCoord.value)
                }
              }
            } catch { /* ignore */ }
            // Check if there's a selected overlay
            const overlayId = styleEditorOverlayId()
            if (overlayId) {
              setContextMenuOverlayId(overlayId)
              setContextMenuMode('overlay')
            } else {
              setContextMenuOverlayId('')
              setContextMenuMode('chart')
            }
            setContextMenuVisible(true)
          }}
        />
        {/* Replay Selection Overlay */}
        <Show when={replaySelecting()}>
          <ReplayOverlay
            locale={props.locale}
            crosshairX={replayCrosshairX()}
            crosshairVisible={replayCrosshairVisible()}
            drawingBarVisible={drawingBarVisible()}
            onCancel={() => cancelReplaySelection()}
          />
        </Show>
        
        <Show when={comparisonSymbols().length > 0}>
          <div class="klinecharts-pro-comparison-legend" style={{ position: 'absolute', top: '60px', left: '10px', 'z-index': 10, display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
            <For each={comparisonSymbols()}>
              {(sym: any) => (
                <div style={{ display: 'flex', 'align-items': 'center', background: 'rgba(0,0,0,0.5)', color: sym.color, padding: '4px 8px', 'border-radius': '4px', 'font-size': '12px' }}>
                  <span style={{ 'margin-right': '8px' }}>{sym.symbol.shortName || sym.symbol.ticker}</span>
                  <Show when={sym.normalizedData && sym.normalizedData.length > 0}>
                    <span style={{ 'margin-right': '8px' }}>
                      {sym.normalizedData[sym.normalizedData.length - 1].value > 0 ? '+' : ''}{sym.normalizedData[sym.normalizedData.length - 1].value.toFixed(2)}%
                    </span>
                  </Show>
                  <button onClick={() => comparisonManager?.removeSymbol(sym.symbol.ticker)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                </div>
              )}
            </For>
          </div>
        </Show>
        {/* Performance Panel */}
        <PerformancePanel 
          visible={performancePanelVisible()} 
          dataPointCount={dataPointCount()} 
        />
      </div>
      {/* Replay Bar */}
      <Show when={replayActive()}>
        <ReplayBar
          locale={props.locale}
          status={replayStatus()}
          index={replayIndex()}
          total={replayTotal()}
          speed={replaySpeed()}
          onPlay={() => getReplayManager()?.play()}
          onPause={() => getReplayManager()?.pause()}
          onStepForward={() => getReplayManager()?.stepForward()}
          onStepBackward={() => getReplayManager()?.stepBackward()}
          onSpeedChange={(speed) => { setReplaySpeed(speed); getReplayManager()?.setSpeed(speed) }}
          onSeek={(index) => getReplayManager()?.seekTo(index)}
          onExit={stopReplay}
        />
      </Show>

      {/* Bottom Status Bar */}
      <BottomBar
        locale={props.locale}
        timezone={timezone().key}
        onGotoDate={gotoDate}
        onPineEditorClick={() => setPineEditorVisible(true)}
        onTimezoneClick={() => { setTimezoneModalVisible(v => !v) }}
      />
      
      {/* Template Modal */}
      <Show when={templateModalVisible()}>
        <TemplateModal
          locale={props.locale}
          templates={templates()}
          onClose={() => setTemplateModalVisible(false)}
          onSaveTemplate={(name) => {
            chartTemplateManager.saveTemplate({
              name,
              mainIndicators: mainIndicators(),
              subIndicators: Object.keys(subIndicators()),
              styles: styles(),
              period: period(),
              theme: props.theme,
              createdAt: Date.now()
            })
            setTemplates(chartTemplateManager.getTemplates())
          }}
          onLoadTemplate={(name) => {
            const template = chartTemplateManager.loadTemplate(name)
            if (template) {
              if (template.theme) setTheme(template.theme)
              if (template.styles) setStyles(template.styles)
              if (template.period) setPeriod(template.period)
              setMainIndicators(template.mainIndicators || [])
              
              // Handle subIndicators which requires pane mapping
              const currentSubs = subIndicators()
              const newSubs: Record<string, string> = {}
              const toAdd = (template.subIndicators || []).filter(ind => !currentSubs[ind])
              const toRemove = Object.keys(currentSubs).filter(ind => !(template.subIndicators || []).includes(ind))
              
              // Remove old
              toRemove.forEach(ind => {
                widget?.removeIndicator(currentSubs[ind], ind)
              })
              // Keep existing
              Object.keys(currentSubs).forEach(ind => {
                if (!toRemove.includes(ind)) newSubs[ind] = currentSubs[ind]
              })
              // Add new
              toAdd.forEach(ind => {
                const paneId = createIndicator(widget, ind, true, undefined, symbol().volumePrecision)
                if (paneId) newSubs[ind] = paneId
              })
              
              setSubIndicators(newSubs)
              setTemplateModalVisible(false)
            }
          }}
          onDeleteTemplate={(name) => {
            chartTemplateManager.deleteTemplate(name)
            setTemplates(chartTemplateManager.getTemplates())
          }}
        />
      </Show>

      {/* Alert Modal */}
      <Show when={alertModalVisible()}>
        <AlertModal
          locale={props.locale}
          currentPrice={contextMenuPrice() || previousPriceRef || 0}
          symbolTicker={symbol().ticker}
          alerts={alerts()}
          onClose={() => setAlertModalVisible(false)}
          onCreateAlert={(alert) => setAlerts([...alerts(), alert])}
          onRemoveAlert={(id) => setAlerts(alerts().filter(a => a.id !== id))}
        />
      </Show>
    </>
  )
}

export default ChartProComponent