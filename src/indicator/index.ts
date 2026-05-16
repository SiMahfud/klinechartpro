/**
 * Built-in custom indicators for klinecharts-pro.
 * These extend the base klinecharts indicator set.
 */

import { IndicatorTemplate } from 'klinecharts'

import cvd from './cvd'
import absorption from './absorption'

const indicators: IndicatorTemplate[] = [cvd as IndicatorTemplate, absorption as IndicatorTemplate]

export default indicators
