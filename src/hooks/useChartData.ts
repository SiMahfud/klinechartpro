import { createSignal, createEffect, on, untrack } from 'solid-js'
import { Chart, KLineData } from 'klinecharts'
import { SymbolInfo, Period, Datafeed } from '../types'
import { ChartStore } from '../store'
import { isTransformChartType, getNativeCandleType, applyTransform, autoCalculateSize } from '../data-transformers'

export interface UseChartDataProps {
  getWidget: () => Chart | null
  datafeed: Datafeed
  symbol: () => SymbolInfo
  period: () => Period
  setLoading: (loading: boolean) => void
  setLoadingVisible: (loading: boolean) => void
  store: ChartStore
  initialChartType?: string
  initialRenkoBrickSize?: number
  initialRangeBarSize?: number
  onDataUpdate?: (data: KLineData) => void
}

export function adjustFromTo(period: Period, toTimestamp: number, count: number): [number, number] {
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
      to = to - (to % (60 * 60 * 1000))
      from = to - count * period.multiplier * 24 * 60 * 60 * 1000
      break
    }
    case 'week': {
      const date = new Date(to)
      const week = date.getDay()
      const dif = week === 0 ? 6 : week - 1
      to = to - dif * 3600 * 24 * 1000
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

export function useChartData(props: UseChartDataProps) {
  const [chartType, setChartType] = createSignal(props.store.getChartType() ?? props.initialChartType ?? 'candle_solid')
  const [renkoBrickSize, setRenkoBrickSize] = createSignal(props.store.getRenkoBrickSize() ?? props.initialRenkoBrickSize ?? 0)
  const [rangeBarSize, setRangeBarSize] = createSignal(props.store.getRangeBarSize() ?? props.initialRangeBarSize ?? 0)
  const [autoSizeValue, setAutoSizeValue] = createSignal(0)
  
  let rawDataCache: KLineData[] = []
  let dataGeneration = 0

  // Handle Chart Type Change
  const handleChartTypeChange = (newType: string) => {
    const oldType = chartType()
    setChartType(newType)
    const widget = props.getWidget()

    widget?.setStyles({ candle: { type: getNativeCandleType(newType) as any } })

    const wasTransform = isTransformChartType(oldType)
    const isTransform = isTransformChartType(newType)

    if (isTransform) {
      if (rawDataCache.length > 0) {
        const transformed = applyTransform(rawDataCache, newType, renkoBrickSize(), rangeBarSize())
        widget?.clearData()
        widget?.applyNewData(transformed, true)
      }
    } else if (wasTransform) {
      if (rawDataCache.length > 0) {
        widget?.clearData()
        widget?.applyNewData(rawDataCache, true)
      }
    }
  }

  // Handle Chart Type Size Change
  const handleChartTypeSizeChange = (size: number) => {
    const ct = chartType()
    if (ct === 'renko') setRenkoBrickSize(size)
    else if (ct === 'range_bar') setRangeBarSize(size)

    const widget = props.getWidget()
    if (rawDataCache.length > 0 && isTransformChartType(ct)) {
      const brickSz = ct === 'renko' ? size : renkoBrickSize()
      const rangeSz = ct === 'range_bar' ? size : rangeBarSize()
      const transformed = applyTransform(rawDataCache, ct, brickSz, rangeSz)
      widget?.clearData()
      widget?.applyNewData(transformed, true)
    }
  }

  // Expose setup load more for onMount
  const setupLoadMore = () => {
    const widget = props.getWidget()
    widget?.loadMore(timestamp => {
      props.setLoading(true)
      const gen = dataGeneration
      const get = async () => {
        const p = props.period()
        const [to] = adjustFromTo(p, timestamp!, 1)
        const [from] = adjustFromTo(p, to, 500)
        const kLineDataList = (await props.datafeed.getHistoryKLineData(props.symbol(), p, from, to)).filter(d => d.close > 0)
        
        if (gen === dataGeneration) {
          const ct = untrack(chartType)
          if (isTransformChartType(ct)) {
            rawDataCache = [...kLineDataList, ...rawDataCache]
            const transformed = applyTransform(rawDataCache, ct, untrack(renkoBrickSize), untrack(rangeBarSize))
            widget?.clearData()
            widget?.applyNewData(transformed, kLineDataList.length > 0)
          } else {
            widget?.applyMoreData(kLineDataList, kLineDataList.length > 0)
          }
        }
        props.setLoading(false)
      }
      get()
    })
  }

  // The main data loading effect
  createEffect(on([props.symbol, props.period], (current, prev) => {
    const [s, p] = current
    const [prevS, prevP] = prev ?? []
    
    if (prevS && prevP) {
      props.datafeed.unsubscribe(prevS, prevP)
    }

    dataGeneration++
    props.setLoading(true)
    props.setLoadingVisible(true)
    
    const get = async () => {
      const [from, to] = adjustFromTo(p, new Date().getTime(), 500)
      const kLineDataList = (await props.datafeed.getHistoryKLineData(s, p, from, to)).filter(d => d.close > 0)
      
      const currentS = untrack(props.symbol)
      const currentP = untrack(props.period)
      const widget = props.getWidget()
      
      if (
        s.ticker === currentS.ticker &&
        p.timespan === currentP.timespan &&
        p.multiplier === currentP.multiplier
      ) {
        rawDataCache = kLineDataList
        const ct = untrack(chartType)
        const displayData = isTransformChartType(ct)
          ? applyTransform(kLineDataList, ct, untrack(renkoBrickSize), untrack(rangeBarSize))
          : kLineDataList
        
        widget?.setStyles({ candle: { type: getNativeCandleType(ct) as any } })
        
        widget?.clearData()
        widget?.applyNewData(displayData, displayData.length > 0)
        
        props.datafeed.subscribe(s, p, data => {
          if (data.close > 0) {
            const currentCt = untrack(chartType)
            if (isTransformChartType(currentCt)) {
              rawDataCache.push(data)
              const transformed = applyTransform(rawDataCache, currentCt, untrack(renkoBrickSize), untrack(rangeBarSize))
              widget?.clearData()
              widget?.applyNewData(transformed, true)
            } else {
              widget?.updateData(data)
            }
            props.onDataUpdate?.(data)
          }
        })
        
        if (kLineDataList.length > 1) {
          setAutoSizeValue(autoCalculateSize(kLineDataList))
        }
      }
      props.setLoading(false)
      props.setLoadingVisible(false)
    }
    get()
  }, { defer: false }))

  return {
    chartType,
    setChartType: handleChartTypeChange, // Return the handler to be used externally
    renkoBrickSize,
    rangeBarSize,
    autoSizeValue,
    handleChartTypeSizeChange,
    setupLoadMore
  }
}
