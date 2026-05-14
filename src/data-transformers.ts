/**
 * Data transformers for Renko, Range Bar, and Line chart types.
 * These functions convert standard OHLC KLineData into specialized formats
 * that can be rendered by the klinecharts library as regular candlesticks.
 */

import { KLineData } from 'klinecharts'

/**
 * Auto-calculate brick/range size based on Average True Range (ATR).
 * Uses a 14-period ATR by default, multiplied by the given factor.
 */
export function autoCalculateSize (data: KLineData[], multiplier: number = 1): number {
  if (!data || data.length < 2) return 1

  const period = Math.min(14, data.length - 1)
  let atrSum = 0

  for (let i = data.length - period; i < data.length; i++) {
    const prev = data[i - 1]
    const curr = data[i]
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    )
    atrSum += tr
  }

  const atr = atrSum / period
  // Round to a sensible precision
  const magnitude = Math.pow(10, Math.floor(Math.log10(atr)))
  const rounded = Math.round((atr * multiplier) / magnitude) * magnitude

  return Math.max(rounded, magnitude) // Ensure at least 1 unit
}

/**
 * Transform OHLC data into Renko bricks.
 *
 * Algorithm:
 * 1. Start with the first candle's close as the reference price
 * 2. For each subsequent candle, check if price has moved >= brickSize
 * 3. If yes, create brick(s). Multiple bricks can form from a single candle
 * 4. Volume is aggregated from contributing source candles
 */
export function transformToRenko (data: KLineData[], brickSize: number): KLineData[] {
  if (!data || data.length === 0 || brickSize <= 0) return data

  const bricks: KLineData[] = []
  let referencePrice = data[0].close
  let accumulatedVolume = data[0].volume ?? 0
  let accumulatedTurnover = data[0].turnover ?? 0
  let lastTimestamp = data[0].timestamp

  for (let i = 1; i < data.length; i++) {
    const candle = data[i]
    const close = candle.close
    accumulatedVolume += candle.volume ?? 0
    accumulatedTurnover += candle.turnover ?? 0
    lastTimestamp = candle.timestamp

    // Check for upward bricks
    while (close >= referencePrice + brickSize) {
      const brickOpen = referencePrice
      const brickClose = referencePrice + brickSize
      bricks.push({
        timestamp: lastTimestamp,
        open: brickOpen,
        close: brickClose,
        high: brickClose,
        low: brickOpen,
        volume: accumulatedVolume,
        turnover: accumulatedTurnover
      })
      referencePrice = brickClose
      accumulatedVolume = 0
      accumulatedTurnover = 0
    }

    // Check for downward bricks
    while (close <= referencePrice - brickSize) {
      const brickOpen = referencePrice
      const brickClose = referencePrice - brickSize
      bricks.push({
        timestamp: lastTimestamp,
        open: brickOpen,
        close: brickClose,
        high: brickOpen,
        low: brickClose,
        volume: accumulatedVolume,
        turnover: accumulatedTurnover
      })
      referencePrice = brickClose
      accumulatedVolume = 0
      accumulatedTurnover = 0
    }
  }

  return bricks.length > 0 ? bricks : data
}

/**
 * Transform OHLC data into Range Bars.
 *
 * Algorithm:
 * 1. Start a new bar with the first candle
 * 2. Track running high and low across subsequent candles
 * 3. When high - low >= rangeSize, close the bar and start a new one
 * 4. The closed bar has exactly rangeSize as its high-low range
 */
export function transformToRangeBar (data: KLineData[], rangeSize: number): KLineData[] {
  if (!data || data.length === 0 || rangeSize <= 0) return data

  const bars: KLineData[] = []

  let barOpen = data[0].open
  let barHigh = data[0].high
  let barLow = data[0].low
  let barVolume = data[0].volume ?? 0
  let barTurnover = data[0].turnover ?? 0
  let barTimestamp = data[0].timestamp

  for (let i = 1; i < data.length; i++) {
    const candle = data[i]

    // Update running high/low
    const newHigh = Math.max(barHigh, candle.high)
    const newLow = Math.min(barLow, candle.low)

    if (newHigh - newLow >= rangeSize) {
      // Determine if the bar closed up or down
      // The bar's range is capped at exactly rangeSize
      let barClose: number
      if (candle.close >= barOpen) {
        // Bullish bar
        barLow = barHigh - rangeSize < barLow ? barLow : barHigh - rangeSize
        barClose = barLow + rangeSize
        barHigh = barClose
      } else {
        // Bearish bar
        barHigh = barLow + rangeSize > barHigh ? barHigh : barLow + rangeSize
        barClose = barHigh - rangeSize
        barLow = barClose
      }

      bars.push({
        timestamp: candle.timestamp,
        open: barOpen,
        close: barClose,
        high: barHigh,
        low: barLow,
        volume: barVolume + (candle.volume ?? 0),
        turnover: barTurnover + (candle.turnover ?? 0)
      })

      // Start new bar from the close of the previous bar
      barOpen = barClose
      barHigh = candle.high
      barLow = candle.low
      barVolume = 0
      barTurnover = 0
      barTimestamp = candle.timestamp
    } else {
      barHigh = newHigh
      barLow = newLow
      barVolume += candle.volume ?? 0
      barTurnover += candle.turnover ?? 0
    }
  }

  // Add the last incomplete bar if there's data
  if (bars.length === 0 || barVolume > 0) {
    bars.push({
      timestamp: data[data.length - 1].timestamp,
      open: barOpen,
      close: data[data.length - 1].close,
      high: barHigh,
      low: barLow,
      volume: barVolume,
      turnover: barTurnover
    })
  }

  return bars.length > 0 ? bars : data
}

/**
 * Check if a chart type requires data transformation (not a native klinecharts CandleType).
 */
export function isTransformChartType (chartType: string): boolean {
  return chartType === 'renko' || chartType === 'range_bar'
}

/**
 * Get the native klinecharts CandleType for a given chart type string.
 * For transform types, we render as candle_solid.
 * For 'line', we use 'area'.
 */
export function getNativeCandleType (chartType: string): string {
  switch (chartType) {
    case 'renko':
    case 'range_bar':
      return 'candle_solid'
    case 'line':
      return 'area'
    default:
      return chartType
  }
}

/**
 * Apply the appropriate data transformation based on chart type.
 */
export function applyTransform (
  data: KLineData[],
  chartType: string,
  brickSize: number,
  rangeSize: number
): KLineData[] {
  switch (chartType) {
    case 'renko': {
      const size = brickSize > 0 ? brickSize : autoCalculateSize(data)
      return transformToRenko(data, size)
    }
    case 'range_bar': {
      const size = rangeSize > 0 ? rangeSize : autoCalculateSize(data, 1.5)
      return transformToRangeBar(data, size)
    }
    default:
      return data
  }
}
