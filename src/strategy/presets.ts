/**
 * Strategy Presets — Ready-to-use strategy templates
 *
 * These combine MTFSR, PRICEACTION, CVD, and ABSORPTION indicators
 * into battle-tested configurations.
 */

import type { StrategyConfig } from './types'

let _idCounter = 0
function uid (): string { return `preset_${Date.now()}_${++_idCounter}` }

// ────────────────────────────────────────────────
// 1. S/R Bounce — Pin Bar at HTF Zone
// ────────────────────────────────────────────────

export const SR_BOUNCE_LONG: StrategyConfig = {
  id: 'preset_sr_bounce_long',
  name: 'S/R Bounce — Long',
  description: 'Enter long when price enters HTF Support zone with a bullish Pin Bar + Buy Volume Spike',
  mode: 'visual',
  initialCapital: 10000,
  currency: 'USD',
  lotSize: 0.1,
  maxOpenTrades: 1,
  costs: { includeSpread: true, spreadPips: 1.5, includeCommission: true, commissionPerLot: 7, pipValue: 10 },

  longEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'pin_bar' } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
    ]
  },
  shortEntry: { logic: 'AND', conditions: [] },
  longExit: {
    logic: 'OR',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'pin_bar' } }
    ]
  },
  shortExit: { logic: 'AND', conditions: [] },

  stopLoss: { type: 'atr_multiple', value: 1.5 },
  takeProfit: { type: 'rr_ratio', value: 2.0 },
  trailingStop: { enabled: false, activationPips: 20, trailPips: 10 }
}

export const SR_BOUNCE_SHORT: StrategyConfig = {
  id: 'preset_sr_bounce_short',
  name: 'S/R Bounce — Short',
  description: 'Enter short when price enters HTF Resistance zone with a bearish Pin Bar + Sell Volume Spike',
  mode: 'visual',
  initialCapital: 10000,
  currency: 'USD',
  lotSize: 0.1,
  maxOpenTrades: 1,
  costs: { includeSpread: true, spreadPips: 1.5, includeCommission: true, commissionPerLot: 7, pipValue: 10 },

  longEntry: { logic: 'AND', conditions: [] },
  shortEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'pin_bar' } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
    ]
  },
  longExit: { logic: 'AND', conditions: [] },
  shortExit: {
    logic: 'OR',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'pin_bar' } }
    ]
  },

  stopLoss: { type: 'atr_multiple', value: 1.5 },
  takeProfit: { type: 'rr_ratio', value: 2.0 },
  trailingStop: { enabled: false, activationPips: 20, trailPips: 10 }
}

// ────────────────────────────────────────────────
// 2. S/R Bounce Bi-Directional (Long + Short)
// ────────────────────────────────────────────────

export const SR_BOUNCE_BOTH: StrategyConfig = {
  id: 'preset_sr_bounce_both',
  name: 'S/R Bounce — Both Directions',
  description: 'Pin Bar rejection at HTF Support (long) or Resistance (short) zones. Exits on opposite zone or pattern reversal.',
  mode: 'visual',
  initialCapital: 10000,
  currency: 'USD',
  lotSize: 0.1,
  maxOpenTrades: 1,
  costs: { includeSpread: true, spreadPips: 1.5, includeCommission: true, commissionPerLot: 7, pipValue: 10 },

  longEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'pin_bar' } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
    ]
  },
  shortEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'pin_bar' } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
    ]
  },
  longExit: {
    logic: 'OR',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } }
    ]
  },
  shortExit: {
    logic: 'OR',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } }
    ]
  },

  stopLoss: { type: 'atr_multiple', value: 1.5 },
  takeProfit: { type: 'rr_ratio', value: 2.0 },
  trailingStop: { enabled: false, activationPips: 20, trailPips: 10 }
}

// ────────────────────────────────────────────────
// 3. Engulfing + Volume Spike at S/R
// ────────────────────────────────────────────────

export const ENGULFING_SR: StrategyConfig = {
  id: 'preset_engulfing_sr',
  name: 'Engulfing at S/R + Volume',
  description: 'Engulfing pattern with volume spike at HTF S/R zones. High conviction reversal setup.',
  mode: 'visual',
  initialCapital: 10000,
  currency: 'USD',
  lotSize: 0.1,
  maxOpenTrades: 1,
  costs: { includeSpread: true, spreadPips: 1.5, includeCommission: true, commissionPerLot: 7, pipValue: 10 },

  longEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'engulfing' } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } },
      { id: uid(), source: 'PRICEACTION', field: 'volSpikeDir', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
    ]
  },
  shortEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'engulfing' } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } },
      { id: uid(), source: 'PRICEACTION', field: 'volSpikeDir', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
    ]
  },
  longExit: { logic: 'OR', conditions: [
    { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'engulfing' } },
    { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
  ]},
  shortExit: { logic: 'OR', conditions: [
    { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'engulfing' } },
    { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
  ]},

  stopLoss: { type: 'atr_multiple', value: 2.0 },
  takeProfit: { type: 'rr_ratio', value: 2.5 },
  trailingStop: { enabled: true, activationPips: 30, trailPips: 15 }
}

// ────────────────────────────────────────────────
// 4. Full Confluence (MTFSR + PA + Absorption)
// ────────────────────────────────────────────────

export const FULL_CONFLUENCE: StrategyConfig = {
  id: 'preset_full_confluence',
  name: 'Full Confluence — S/R + PA + Absorption',
  description: 'Maximum confluence: Price in HTF zone + Pin Bar/Engulfing + Absorption signal. Fewer trades but highest probability.',
  mode: 'visual',
  initialCapital: 10000,
  currency: 'USD',
  lotSize: 0.1,
  maxOpenTrades: 1,
  costs: { includeSpread: true, spreadPips: 1.5, includeCommission: true, commissionPerLot: 7, pipValue: 10 },

  longEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } },
      { id: uid(), source: 'ABSORPTION', field: 'absorption', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
    ]
  },
  shortEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } },
      { id: uid(), source: 'ABSORPTION', field: 'absorption', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
    ]
  },
  longExit: { logic: 'OR', conditions: [
    { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
    { id: uid(), source: 'ABSORPTION', field: 'absorption', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
  ]},
  shortExit: { logic: 'OR', conditions: [
    { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
    { id: uid(), source: 'ABSORPTION', field: 'absorption', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
  ]},

  stopLoss: { type: 'atr_multiple', value: 1.5 },
  takeProfit: { type: 'rr_ratio', value: 3.0 },
  trailingStop: { enabled: true, activationPips: 25, trailPips: 10 }
}

// ────────────────────────────────────────────────
// 5. Volume Spike Scalper (no S/R needed)
// ────────────────────────────────────────────────

export const VOLUME_SPIKE_SCALPER: StrategyConfig = {
  id: 'preset_vol_spike_scalper',
  name: 'Volume Spike Scalper',
  description: 'Quick entries on volume spike + engulfing pattern. Fast scalp with tight SL. No S/R required.',
  mode: 'visual',
  initialCapital: 10000,
  currency: 'USD',
  lotSize: 0.1,
  maxOpenTrades: 2,
  costs: { includeSpread: true, spreadPips: 1.0, includeCommission: true, commissionPerLot: 7, pipValue: 10 },

  longEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'PRICEACTION', field: 'volSpikeDir', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'engulfing' } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
    ]
  },
  shortEntry: {
    logic: 'AND',
    conditions: [
      { id: uid(), source: 'PRICEACTION', field: 'volSpikeDir', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } },
      { id: uid(), source: 'PRICEACTION', field: 'pattern', operator: 'equals', compareWith: { type: 'value', stringValue: 'engulfing' } },
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
    ]
  },
  longExit: { logic: 'OR', conditions: [
    { id: uid(), source: 'PRICEACTION', field: 'volSpikeDir', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
  ]},
  shortExit: { logic: 'OR', conditions: [
    { id: uid(), source: 'PRICEACTION', field: 'volSpikeDir', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
  ]},

  stopLoss: { type: 'atr_multiple', value: 1.5 },
  takeProfit: { type: 'rr_ratio', value: 2.0 },
  trailingStop: { enabled: true, activationPips: 20, trailPips: 10 }
}

// ────────────────────────────────────────────────
// Export all presets
// ────────────────────────────────────────────────

// ────────────────────────────────────────────────
// 6. SR Zone Reversal — Percentage-Based (Long + Short)
// ────────────────────────────────────────────────

export const SR_ZONE_REVERSAL: StrategyConfig = {
  id: 'preset_sr_zone_reversal',
  name: 'SR Zone Reversal (% Based)',
  description: 'Enter when price penetrates ≥30% into HTF SR zone with rejection candle (pin bar/engulfing). SL placed 20% outside zone edge. RR 1:1.',
  mode: 'visual',
  initialCapital: 10000,
  currency: 'USD',
  lotSize: 0.1,
  maxOpenTrades: 1,
  costs: { includeSpread: true, spreadPips: 1.5, includeCommission: true, commissionPerLot: 7, pipValue: 10 },

  longEntry: {
    logic: 'AND',
    conditions: [
      // Price must be inside support zone
      { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      // Price has penetrated ≥30% into the zone
      { id: uid(), source: 'MTFSR', field: 'supportPenetration', operator: 'greater_equal', compareWith: { type: 'value', value: 30 } },
      // Bullish rejection pattern (pin bar or engulfing)
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
    ]
  },
  shortEntry: {
    logic: 'AND',
    conditions: [
      // Price must be inside resistance zone
      { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      // Price has penetrated ≥30% into the zone
      { id: uid(), source: 'MTFSR', field: 'resistancePenetration', operator: 'greater_equal', compareWith: { type: 'value', value: 30 } },
      // Bearish rejection pattern
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
    ]
  },
  longExit: {
    logic: 'OR',
    conditions: [
      // Exit when price enters resistance zone (target area)
      { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } }
    ]
  },
  shortExit: {
    logic: 'OR',
    conditions: [
      // Exit when price enters support zone (target area)
      { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } }
    ]
  },

  stopLoss: { type: 'sr_zone_percent', value: 20 },  // SL 20% outside zone edge
  takeProfit: { type: 'rr_ratio', value: 1.0 },       // RR 1:1
  trailingStop: { enabled: false, activationPips: 20, trailPips: 10 }
}

// ────────────────────────────────────────────────
// 7. SR Zone Breakout Retest — Percentage-Based
// ────────────────────────────────────────────────

export const SR_ZONE_BREAKOUT_RETEST: StrategyConfig = {
  id: 'preset_sr_zone_breakout_retest',
  name: 'SR Zone Breakout Retest (% Based)',
  description: 'After breakout, wait for retest (shallow penetration ≤40% back into zone) with rejection candle. SL 20% outside zone. RR 1:1.',
  mode: 'visual',
  initialCapital: 10000,
  currency: 'USD',
  lotSize: 0.1,
  maxOpenTrades: 1,
  costs: { includeSpread: true, spreadPips: 1.5, includeCommission: true, commissionPerLot: 7, pipValue: 10 },

  longEntry: {
    logic: 'AND',
    conditions: [
      // Price is retesting resistance zone from above (wick into zone)
      { id: uid(), source: 'MTFSR', field: 'insideResistance', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      // Shallow retest: only penetrated ≤40% (not deep — just a retest)
      { id: uid(), source: 'MTFSR', field: 'resistancePenetration', operator: 'less_equal', compareWith: { type: 'value', value: 40 } },
      // Bullish rejection = price bouncing back up from retest
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } },
      // Close must be above zone top (confirms breakout held)
      { id: uid(), source: 'price', field: 'close', operator: 'greater_than', compareWith: { type: 'indicator', source: 'MTFSR', field: 'resistanceZoneTop' } }
    ]
  },
  shortEntry: {
    logic: 'AND',
    conditions: [
      // Price is retesting support zone from below (wick into zone)
      { id: uid(), source: 'MTFSR', field: 'insideSupport', operator: 'is_true', compareWith: { type: 'value', value: 1 } },
      // Shallow retest
      { id: uid(), source: 'MTFSR', field: 'supportPenetration', operator: 'less_equal', compareWith: { type: 'value', value: 40 } },
      // Bearish rejection = price dropping back down from retest
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } },
      // Close must be below zone bottom (confirms breakdown held)
      { id: uid(), source: 'price', field: 'close', operator: 'less_than', compareWith: { type: 'indicator', source: 'MTFSR', field: 'supportZoneBottom' } }
    ]
  },
  longExit: {
    logic: 'OR',
    conditions: [
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bear' } }
    ]
  },
  shortExit: {
    logic: 'OR',
    conditions: [
      { id: uid(), source: 'PRICEACTION', field: 'direction', operator: 'equals', compareWith: { type: 'value', stringValue: 'bull' } }
    ]
  },

  stopLoss: { type: 'sr_zone_percent', value: 20 },  // SL 20% outside zone edge
  takeProfit: { type: 'rr_ratio', value: 1.0 },       // RR 1:1
  trailingStop: { enabled: false, activationPips: 20, trailPips: 10 }
}

// ────────────────────────────────────────────────

export const STRATEGY_PRESETS: StrategyConfig[] = [
  SR_ZONE_REVERSAL,
  SR_ZONE_BREAKOUT_RETEST,
  SR_BOUNCE_BOTH,
  SR_BOUNCE_LONG,
  SR_BOUNCE_SHORT,
  ENGULFING_SR,
  FULL_CONFLUENCE,
  VOLUME_SPIKE_SCALPER
]
