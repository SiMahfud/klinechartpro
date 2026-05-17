/**
 * Built-in custom indicators for klinecharts-pro.
 * These extend the base klinecharts indicator set.
 */

import { IndicatorTemplate } from 'klinecharts'

import cvd from './cvd'
import absorption from './absorption'
import mtfsr from './mtfsr'
import priceaction from './priceaction'

const indicators: IndicatorTemplate[] = [cvd as IndicatorTemplate, absorption as IndicatorTemplate, mtfsr as IndicatorTemplate, priceaction as IndicatorTemplate]

export default indicators
