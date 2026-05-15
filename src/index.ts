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

import { registerOverlay, registerIndicator, OverlayTemplate, IndicatorTemplate } from 'klinecharts'

import overlays from './extension'
import builtInIndicators from './indicator'

import DefaultDatafeed from './DefaultDatafeed'
import KLineChartPro from './KLineChartPro'
import { ChartStore } from './store'
import { DrawingStore } from './drawing-store'
import { ComparisonManager } from './comparison'
import { ErrorManager, withRetry, withTimeout } from './error'
import { customRegistry } from './registry'
import { KeyboardShortcutManager } from './keyboard-shortcuts'
import { ChartTemplateManager } from './chart-template'
import { CrosshairSyncManager } from './crosshair-sync'
import { BarReplayManager } from './bar-replay'

import { load } from './i18n'

import {
  Datafeed, SymbolInfo, Period, DatafeedSubscribeCallback,
  ChartProOptions, ChartPro, AlertConfig, CustomIndicatorConfig,
  PersistenceOptions
} from './types'

import './index.less'

overlays.forEach(o => { registerOverlay(o) })
builtInIndicators.forEach(i => { registerIndicator(i) })

export interface RegisterOverlayOptions {
  /** The klinecharts OverlayTemplate */
  template: OverlayTemplate
  /** Display label in the drawing toolbar menu. Defaults to template.name */
  label?: string
}

export interface RegisterIndicatorOptions {
  /** The klinecharts IndicatorTemplate */
  template: IndicatorTemplate
  /** Display label in the indicator menu. Defaults to template.shortName or template.name */
  label?: string
  /** Where the indicator appears: 'main' (candle pane) or 'sub' (new pane). Defaults to 'sub' */
  paneType?: 'main' | 'sub'
}

/**
 * Register a custom overlay (drawing tool).
 * It will be registered with klinecharts AND automatically appear
 * in the drawing toolbar menu under the "Custom" group.
 *
 * @example
 * ```ts
 * import { registerCustomOverlay } from '@anthropic/klinecharts-pro'
 *
 * // Simple: just pass an OverlayTemplate directly
 * registerCustomOverlay({
 *   name: 'myCustomTool',
 *   totalStep: 3,
 *   createPointFigures: ({ coordinates }) => {
 *     return [{ type: 'line', attrs: { coordinates: [coordinates[0], coordinates[1]] } }]
 *   }
 * })
 *
 * // Advanced: pass options with custom label
 * registerCustomOverlay({
 *   template: { name: 'myTool', totalStep: 2, ... },
 *   label: 'My Custom Tool'
 * })
 * ```
 */
export function registerCustomOverlay (templateOrOptions: OverlayTemplate | RegisterOverlayOptions): void {
  if ('template' in templateOrOptions) {
    // Advanced form with options
    const { template, label } = templateOrOptions
    registerOverlay(template)
    customRegistry.addOverlay({
      name: template.name,
      label: label ?? template.name
    })
  } else {
    // Simple form: just the template
    registerOverlay(templateOrOptions)
    customRegistry.addOverlay({
      name: templateOrOptions.name,
      label: templateOrOptions.name
    })
  }
}

/**
 * Register a custom technical indicator.
 * It will be registered with klinecharts AND automatically appear
 * in the indicator modal menu.
 *
 * @example
 * ```ts
 * import { registerCustomIndicator } from '@anthropic/klinecharts-pro'
 *
 * // Simple: just pass an IndicatorTemplate
 * registerCustomIndicator({
 *   name: 'MyRSI',
 *   shortName: 'MRSI',
 *   calcParams: [14],
 *   figures: [{ key: 'rsi', title: 'RSI: ', type: 'line' }],
 *   calc: (dataList, indicator) => {
 *     // ... your calculation
 *     return dataList.map(() => ({ rsi: 50 }))
 *   }
 * })
 *
 * // Advanced: with custom label and pane type
 * registerCustomIndicator({
 *   template: { name: 'VWAP', ... },
 *   label: 'Volume Weighted Average Price',
 *   paneType: 'main'  // appears on main candle chart
 * })
 * ```
 */
export function registerCustomIndicator (templateOrOptions: IndicatorTemplate | RegisterIndicatorOptions): void {
  if ('template' in templateOrOptions) {
    const { template, label, paneType } = templateOrOptions
    registerIndicator(template)
    customRegistry.addIndicator({
      name: template.name,
      label: label ?? template.shortName ?? template.name,
      paneType: paneType ?? 'sub'
    })
  } else {
    registerIndicator(templateOrOptions)
    customRegistry.addIndicator({
      name: templateOrOptions.name,
      label: templateOrOptions.shortName ?? templateOrOptions.name,
      paneType: 'sub'
    })
  }
}

export {
  DefaultDatafeed,
  KLineChartPro,
  ChartStore,
  DrawingStore,
  ComparisonManager,
  ErrorManager,
  withRetry,
  withTimeout,
  customRegistry,
  KeyboardShortcutManager,
  ChartTemplateManager,
  CrosshairSyncManager,
  BarReplayManager,
  load as loadLocales
}

export type {
  OverlayTemplate,
  IndicatorTemplate,
  Datafeed, SymbolInfo, Period, DatafeedSubscribeCallback,
  ChartProOptions, ChartPro, AlertConfig, CustomIndicatorConfig,
  PersistenceOptions
}
