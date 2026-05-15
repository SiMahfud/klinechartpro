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

import { Component, createSignal, onMount, onCleanup } from 'solid-js'

import { Modal, List, Checkbox } from '../../component'

import i18n from '../../i18n'

import { MAIN_INDICATOR_NAMES, SUB_INDICATOR_NAMES } from '../../config'
import { customRegistry, CustomRegistryItem } from '../../registry'

type OnIndicatorChange = (
  params: {
    name: string
    paneId: string
    added: boolean
  }
) => void

export interface IndicatorModalProps {
  locale: string
  mainIndicators: string[]
  subIndicators: Record<string, string>
  onMainIndicatorChange: OnIndicatorChange
  onSubIndicatorChange: OnIndicatorChange
  onDeleteCustomIndicator?: (name: string) => void
  onEditCustomIndicator?: (name: string) => void
  onClose: () => void
}

const IndicatorModal: Component<IndicatorModalProps> = props => {
  const [customMain, setCustomMain] = createSignal<CustomRegistryItem[]>(
    customRegistry.getCustomMainIndicators()
  )
  const [customSub, setCustomSub] = createSignal<CustomRegistryItem[]>(
    customRegistry.getCustomSubIndicators()
  )

  onMount(() => {
    const unsub = customRegistry.onChange(() => {
      setCustomMain(customRegistry.getCustomMainIndicators())
      setCustomSub(customRegistry.getCustomSubIndicators())
    })
    onCleanup(unsub)
  })

  return (
    <Modal
      title={i18n('indicator', props.locale)}
      width={400}
      onClose={props.onClose}>
      <List
        class="klinecharts-pro-indicator-modal-list">
        <li class="title">{i18n('main_indicator', props.locale)}</li>
        {
          MAIN_INDICATOR_NAMES.map(name => {
            const checked = props.mainIndicators.includes(name)
            return (
              <li
                class="row"
                onClick={_ => {
                  props.onMainIndicatorChange({ name, paneId: 'candle_pane', added: !checked })
                }}>
                <Checkbox checked={checked} label={i18n(name.toLowerCase(), props.locale)}/>
              </li>
            )
          })
        }
        {/* Custom main indicators */}
        {
          customMain().map(item => {
            const checked = props.mainIndicators.includes(item.name)
            return (
              <li
                class="row"
                style={{ "justify-content": 'space-between' }}
                onClick={_ => {
                  props.onMainIndicatorChange({ name: item.name, paneId: 'candle_pane', added: !checked })
                }}>
                <Checkbox checked={checked} label={item.label}/>
                <div style={{ display: 'flex', gap: '12px', "align-items": 'center' }} onClick={e => e.stopPropagation()}>
                  <span title="Edit" onClick={() => props.onEditCustomIndicator?.(item.name)} style={{ cursor: 'pointer', "font-size": '16px' }}>✎</span>
                  <span title="Delete" onClick={() => props.onDeleteCustomIndicator?.(item.name)} style={{ cursor: 'pointer', "font-size": '14px', color: '#ff4d4f' }}>✖</span>
                </div>
              </li>
            )
          })
        }
        <li class="title">{i18n('sub_indicator', props.locale)}</li>
        {
          SUB_INDICATOR_NAMES.map(name => {
            const checked = name in props.subIndicators
            return (
              <li
                class="row"
                onClick={_ => {
                  props.onSubIndicatorChange({ name, paneId: props.subIndicators[name] ?? '', added: !checked });
                }}>
                <Checkbox checked={checked} label={i18n(name.toLowerCase(), props.locale)}/>
              </li>
            )
          })
        }
        {/* Custom sub indicators */}
        {
          customSub().map(item => {
            const checked = item.name in props.subIndicators
            return (
              <li
                class="row"
                style={{ "justify-content": 'space-between' }}
                onClick={_ => {
                  props.onSubIndicatorChange({ name: item.name, paneId: props.subIndicators[item.name] ?? '', added: !checked })
                }}>
                <Checkbox checked={checked} label={item.label}/>
                <div style={{ display: 'flex', gap: '12px', "align-items": 'center' }} onClick={e => e.stopPropagation()}>
                  <span title="Edit" onClick={() => props.onEditCustomIndicator?.(item.name)} style={{ cursor: 'pointer', "font-size": '16px' }}>✎</span>
                  <span title="Delete" onClick={() => props.onDeleteCustomIndicator?.(item.name)} style={{ cursor: 'pointer', "font-size": '14px', color: '#ff4d4f' }}>✖</span>
                </div>
              </li>
            )
          })
        }
      </List>
    </Modal>
  )
}

export default IndicatorModal
