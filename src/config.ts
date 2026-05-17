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

/**
 * Shared configuration for indicator names used across the chart.
 * Single source of truth — update here to add/remove indicators everywhere.
 */
export const MAIN_INDICATOR_NAMES: string[] = [
  'ABSORPTION', 'MTFSR', 'PRICEACTION', 'MA', 'EMA', 'SMA', 'BOLL', 'SAR', 'BBI'
]

export const SUB_INDICATOR_NAMES: string[] = [
  'CVD', 'MA', 'EMA', 'VOL', 'MACD', 'BOLL', 'KDJ',
  'RSI', 'BIAS', 'BRAR', 'CCI', 'DMI',
  'CR', 'PSY', 'DMA', 'TRIX', 'OBV',
  'VR', 'WR', 'MTM', 'EMV', 'SAR',
  'SMA', 'ROC', 'PVT', 'BBI', 'AO'
]

export const DEFAULT_MAIN_INDICATORS: string[] = ['MA']
export const DEFAULT_SUB_INDICATORS: string[] = ['VOL']

export const DEFAULT_PERIODS = [
  { multiplier: 1, timespan: 'minute', text: '1m' },
  { multiplier: 5, timespan: 'minute', text: '5m' },
  { multiplier: 15, timespan: 'minute', text: '15m' },
  { multiplier: 30, timespan: 'minute', text: '30m' },
  { multiplier: 1, timespan: 'hour', text: '1H' },
  { multiplier: 2, timespan: 'hour', text: '2H' },
  { multiplier: 4, timespan: 'hour', text: '4H' },
  { multiplier: 1, timespan: 'day', text: 'D' },
  { multiplier: 1, timespan: 'week', text: 'W' },
  { multiplier: 1, timespan: 'month', text: 'M' },
  { multiplier: 1, timespan: 'year', text: 'Y' }
]

/** localStorage key prefix for persistence */
export const STORAGE_PREFIX = 'klinecharts-pro'
