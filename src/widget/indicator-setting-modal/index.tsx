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

import { Component, createSignal } from 'solid-js'

import { utils } from 'klinecharts'

import { Modal, Input, Switch, Select, Checkbox } from '../../component'
import type { SelectDataSourceItem } from '../../component'

import i18n from '../../i18n'

import data from './data'
import type { ParamConfig } from './data'

export interface IndicatorSettingModalProps {
  locale: string
  params: { indicatorName: string, paneId: string, calcParams: any[], extendData?: any }
  onClose: () => void
  onConfirm: (calcParams: any) => void
}

const IndicatorSettingModal: Component<IndicatorSettingModalProps> = props => {
  const [calcParams, setCalcParams] = createSignal(utils.clone(props.params.calcParams))

  const getConfig: (name: string) => ParamConfig[] = (name: string) => {
    let config = data[name]
    if (!config) {
      // Fallback for custom indicators (like Pine Script)
      config = props.params.calcParams.map((param, index) => {
        const title = props.params.extendData?.pineInputs?.[index] || `Param ${index + 1}`
        return {
          paramNameKey: title,
          precision: typeof param === 'number' && !Number.isInteger(param) ? 2 : 0,
          min: typeof param === 'number' ? -99999 : undefined,
          default: param
        }
      })
    }
    return config
  }

  const updateParam = (index: number, value: any) => {
    const params = utils.clone(calcParams())
    params[index] = value
    setCalcParams(params)
  }

  /**
   * Render the appropriate control based on config type.
   * All values are stored as numbers in calcParams.
   */
  const renderControl = (d: ParamConfig, i: number) => {
    const type = d.type ?? 'number'

    switch (type) {
      case 'switch':
        return (
          <Switch
            open={calcParams()[i] === 1}
            onChange={() => {
              updateParam(i, calcParams()[i] === 1 ? 0 : 1)
            }}
          />
        )

      case 'checkbox':
        return (
          <Checkbox
            checked={calcParams()[i] === 1}
            onChange={(checked: boolean) => {
              updateParam(i, checked ? 1 : 0)
            }}
          />
        )

      case 'select': {
        const options = d.options ?? []
        const currentValue = calcParams()[i] ?? d.default ?? 0
        const currentOption = options.find(o => o.value === currentValue)
        const currentLabel = currentOption ? i18n(currentOption.labelKey, props.locale) : String(currentValue)

        const dataSource: SelectDataSourceItem[] = options.map(opt => ({
          key: String(opt.value),
          text: i18n(opt.labelKey, props.locale)
        }))

        return (
          <Select
            style={{ width: '200px' }}
            value={currentLabel}
            dataSource={dataSource}
            onSelected={(selected) => {
              const item = selected as SelectDataSourceItem
              updateParam(i, Number(item.key))
            }}
          />
        )
      }

      case 'number':
      default:
        return (
          <Input
            style={{ width: '200px' }}
            value={calcParams()[i] ?? ''}
            precision={d.precision}
            min={d.min}
            onChange={value => {
              updateParam(i, value)
            }}
          />
        )
    }
  }

  return (
    <Modal
      title={props.params.indicatorName}
      width={400}
      buttons={[
        {
          type: 'confirm',
          children: i18n('confirm', props.locale),
          onClick: () => {
            const config = getConfig(props.params.indicatorName)
            const params: any[] = []
            utils.clone(calcParams()).forEach((param: any, i: number) => {
              if (!utils.isValid(param) || param === '') {
                if ('default' in config[i]) {
                  params.push(config[i]['default'])
                }
              } else {
                params.push(param)
              }
            })
            props.onConfirm(params)
            props.onClose()
          }
        }
      ]}
      onClose={props.onClose}>
      <div class="klinecharts-pro-indicator-setting-modal-content">
        {
          getConfig(props.params.indicatorName).map((d, i) => {
            const type = d.type ?? 'number'
            return (
              <>
                <span class={`param-label ${type !== 'number' ? 'param-label-toggle' : ''}`}>
                  {i18n(d.paramNameKey, props.locale)}
                </span>
                <div class={`param-control param-control-${type}`}>
                  {renderControl(d, i)}
                </div>
              </>
            )
          })
        }
      </div>
      
    </Modal>
  )
}

export default IndicatorSettingModal
