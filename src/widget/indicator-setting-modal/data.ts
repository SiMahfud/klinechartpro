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
 * Indicator Setting Modal Configuration.
 * 
 * Each entry maps an indicator name to an array of parameter configs.
 * Each config describes how the parameter should be rendered in the settings modal.
 * 
 * Supported types:
 *   'number'   — (default) Numeric input field
 *   'switch'   — Toggle switch (maps to 0/1)
 *   'checkbox'  — Checkbox toggle (maps to 0/1)
 *   'select'   — Dropdown select (maps to numeric value from options)
 * 
 * All values are stored as numbers in calcParams for klinecharts compatibility.
 */

export interface ParamSelectOption {
  value: number
  labelKey: string
}

export interface ParamConfig {
  paramNameKey: string
  /** Input type. Defaults to 'number' if omitted. */
  type?: 'number' | 'switch' | 'checkbox' | 'select'
  /** For 'number' type: decimal precision */
  precision?: number
  /** For 'number' type: minimum value */
  min?: number
  /** Default value */
  default?: number
  /** For indicators with color-linked lines */
  styleKey?: string
  /** For 'select' type: dropdown options */
  options?: ParamSelectOption[]
}

const data: Record<string, ParamConfig[]> = {
  AO: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 5 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 34 }
  ],
  BIAS: [
    { paramNameKey: 'BIAS1', precision: 0, min: 1, styleKey: 'lines[0].color' },
    { paramNameKey: 'BIAS2', precision: 0, min: 1, styleKey: 'lines[1].color' },
    { paramNameKey: 'BIAS3', precision: 0, min: 1, styleKey: 'lines[2].color' },
    { paramNameKey: 'BIAS4', precision: 0, min: 1, styleKey: 'lines[3].color' },
    { paramNameKey: 'BIAS5', precision: 0, min: 1, styleKey: 'lines[4].color' }
  ],
  BOLL: [
    { paramNameKey: 'period', precision: 0, min: 1, default: 20 },
    { paramNameKey: 'standard_deviation', precision: 2, min: 1, default: 2 }
  ],
  BRAR: [
    { paramNameKey: 'period', precision: 0, min: 1, default: 26 }
  ],
  BBI: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 3 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 6 },
    { paramNameKey: 'params_3', precision: 0, min: 1, default: 12 },
    { paramNameKey: 'params_4', precision: 0, min: 1, default: 24 }
  ],
  CCI: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 20 }
  ],
  CR: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 26 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 10 },
    { paramNameKey: 'params_3', precision: 0, min: 1, default: 20 },
    { paramNameKey: 'params_4', precision: 0, min: 1, default: 40 },
    { paramNameKey: 'params_5', precision: 0, min: 1, default: 60 }
  ],
  DMA: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 10 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 50 },
    { paramNameKey: 'params_3', precision: 0, min: 1, default: 10 }
  ],
  DMI: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 14 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 6 }
  ],
  EMV: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 14 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 9 }
  ],
  EMA: [
    { paramNameKey: 'EMA1', precision: 0, min: 1, styleKey: 'lines[0].color' },
    { paramNameKey: 'EMA2', precision: 0, min: 1, styleKey: 'lines[1].color' },
    { paramNameKey: 'EMA3', precision: 0, min: 1, styleKey: 'lines[2].color' },
    { paramNameKey: 'EMA4', precision: 0, min: 1, styleKey: 'lines[3].color' },
    { paramNameKey: 'EMA5', precision: 0, min: 1, styleKey: 'lines[4].color' }
  ],
  MTM: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 12 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 6 }
  ],
  MA: [
    { paramNameKey: 'MA1', precision: 0, min: 1, styleKey: 'lines[0].color' },
    { paramNameKey: 'MA2', precision: 0, min: 1, styleKey: 'lines[1].color' },
    { paramNameKey: 'MA3', precision: 0, min: 1, styleKey: 'lines[2].color' },
    { paramNameKey: 'MA4', precision: 0, min: 1, styleKey: 'lines[3].color' },
    { paramNameKey: 'MA5', precision: 0, min: 1, styleKey: 'lines[4].color' },
  ],
  MACD: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 12 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 26 },
    { paramNameKey: 'params_3', precision: 0, min: 1, default: 9 }
  ],
  OBV: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 30 }
  ],
  PVT: [],
  PSY: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 12 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 6 }
  ],
  ROC: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 12 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 6 }
  ],
  RSI: [
    { paramNameKey: 'RSI1', precision: 0, min: 1, styleKey: 'lines[0].color' },
    { paramNameKey: 'RSI2', precision: 0, min: 1, styleKey: 'lines[1].color' },
    { paramNameKey: 'RSI3', precision: 0, min: 1, styleKey: 'lines[2].color' },
    { paramNameKey: 'RSI4', precision: 0, min: 1, styleKey: 'lines[3].color' },
    { paramNameKey: 'RSI5', precision: 0, min: 1, styleKey: 'lines[4].color' }
  ],
  SMA: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 12 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 2 }
  ],
  KDJ: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 9 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 3 },
    { paramNameKey: 'params_3', precision: 0, min: 1, default: 3 }
  ],
  SAR: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 2 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 2 },
    { paramNameKey: 'params_3', precision: 0, min: 1, default: 20 }
  ],
  TRIX: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 12 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 9 }
  ],
  VOL: [
    { paramNameKey: 'MA1', precision: 0, min: 1, styleKey: 'lines[0].color' },
    { paramNameKey: 'MA2', precision: 0, min: 1, styleKey: 'lines[1].color' },
    { paramNameKey: 'MA3', precision: 0, min: 1, styleKey: 'lines[2].color' },
    { paramNameKey: 'MA4', precision: 0, min: 1, styleKey: 'lines[3].color' },
    { paramNameKey: 'MA5', precision: 0, min: 1, styleKey: 'lines[4].color' },
  ],
  VR: [
    { paramNameKey: 'params_1', precision: 0, min: 1, default: 26 },
    { paramNameKey: 'params_2', precision: 0, min: 1, default: 6 }
  ],
  WR: [
    { paramNameKey: 'WR1', precision: 0, min: 1, styleKey: 'lines[0].color' },
    { paramNameKey: 'WR2', precision: 0, min: 1, styleKey: 'lines[1].color' },
    { paramNameKey: 'WR3', precision: 0, min: 1, styleKey: 'lines[2].color' },
    { paramNameKey: 'WR4', precision: 0, min: 1, styleKey: 'lines[3].color' },
    { paramNameKey: 'WR5', precision: 0, min: 1, styleKey: 'lines[4].color' },
  ],
  // ─── Enhanced with rich UI types ───
  CVD: [
    { paramNameKey: 'cvd_ma_period', precision: 0, min: 1, default: 20 },
    { paramNameKey: 'cvd_reset_mode', type: 'select', default: 0, options: [
      { value: 0, labelKey: 'none' },
      { value: 1, labelKey: 'daily' },
      { value: 2, labelKey: 'weekly' }
    ]},
    { paramNameKey: 'cvd_show_ma', type: 'switch', default: 1 },
    { paramNameKey: 'cvd_show_divergence', type: 'switch', default: 1 },
    { paramNameKey: 'cvd_div_lookback', precision: 0, min: 2, default: 5 }
  ],
  ABSORPTION: [
    { paramNameKey: 'absorption_vol_period', precision: 0, min: 1, default: 20 },
    { paramNameKey: 'absorption_sensitivity', precision: 0, min: 1, default: 2 },
    { paramNameKey: 'absorption_show_bubbles', type: 'switch', default: 1 },
    { paramNameKey: 'absorption_show_bg', type: 'switch', default: 1 }
  ],
  MTFSR: [
    { paramNameKey: 'mtfsr_lookback', precision: 0, min: 20, default: 200 },
    { paramNameKey: 'mtfsr_pivot_strength', precision: 0, min: 1, default: 3 },
    { paramNameKey: 'mtfsr_min_touch', precision: 0, min: 1, default: 2 },
    { paramNameKey: 'mtfsr_max_zones', precision: 0, min: 1, default: 5 },
    { paramNameKey: 'mtfsr_show_1h', type: 'checkbox', default: 1 },
    { paramNameKey: 'mtfsr_show_4h', type: 'checkbox', default: 1 },
    { paramNameKey: 'mtfsr_show_daily', type: 'checkbox', default: 1 },
    { paramNameKey: 'mtfsr_show_weekly', type: 'checkbox', default: 1 },
    { paramNameKey: 'mtfsr_show_monthly', type: 'checkbox', default: 0 },
    { paramNameKey: 'mtfsr_data_mode', type: 'select', default: 0, options: [
      { value: 0, labelKey: 'mtfsr_mode_synthetic' },
      { value: 1, labelKey: 'mtfsr_mode_api' }
    ]}
  ],
  PRICEACTION: [
    { paramNameKey: 'pa_vol_period', precision: 0, min: 5, default: 20 },
    { paramNameKey: 'pa_vol_spike_mult', precision: 0, min: 10, default: 20 },
    { paramNameKey: 'pa_pin_wick_ratio', precision: 0, min: 10, default: 20 },
    { paramNameKey: 'pa_show_pin', type: 'switch', default: 1 },
    { paramNameKey: 'pa_show_engulf', type: 'switch', default: 1 },
    { paramNameKey: 'pa_show_inside', type: 'switch', default: 1 },
    { paramNameKey: 'pa_show_doji', type: 'switch', default: 1 },
    { paramNameKey: 'pa_show_volspike', type: 'switch', default: 1 }
  ]
}

export default data
