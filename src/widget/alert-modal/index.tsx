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

import { Component, createSignal, For } from 'solid-js'
import { Modal, Input, Select } from '../../component'
import type { SelectDataSourceItem } from '../../component'
import i18n from '../../i18n'
import { AlertConfig, AlertCondition } from '../../types'

export interface AlertModalProps {
  locale: string
  currentPrice: number
  symbolTicker: string
  alerts: AlertConfig[]
  onClose: () => void
  onCreateAlert: (alert: AlertConfig) => void
  onRemoveAlert: (id: string) => void
}

const AlertModal: Component<AlertModalProps> = props => {
  const [price, setPrice] = createSignal<any>(props.currentPrice)
  const [condition, setCondition] = createSignal<AlertCondition>('crosses_above')
  const [message, setMessage] = createSignal('')

  const conditionOptions: SelectDataSourceItem[] = [
    { key: 'crosses_above', text: i18n('crosses_above', props.locale) },
    { key: 'crosses_below', text: i18n('crosses_below', props.locale) },
    { key: 'reaches', text: i18n('reaches', props.locale) }
  ]

  const createAlert = () => {
    const alert: AlertConfig = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      symbol: props.symbolTicker,
      condition: condition(),
      price: Number(price()),
      message: message() || undefined,
      triggered: false
    }
    props.onCreateAlert(alert)
    setPrice(props.currentPrice)
    setMessage('')
  }

  return (
    <Modal
      title={i18n('price_alert', props.locale)}
      width={440}
      onClose={props.onClose}>
      <div class="klinecharts-pro-alert-modal-content">
        <div class="alert-form">
          <div class="form-row">
            <span class="form-label">{i18n('price_alert', props.locale)}</span>
            <Input
              style={{ width: '160px' }}
              value={price()}
              onChange={v => setPrice(v)} />
          </div>
          <div class="form-row">
            <span class="form-label">{i18n('alert', props.locale)}</span>
            <Select
              style={{ width: '160px' }}
              value={i18n(condition(), props.locale)}
              dataSource={conditionOptions}
              onSelected={(data) => {
                setCondition((data as SelectDataSourceItem).key as AlertCondition)
              }} />
          </div>
          <button class="create-alert-btn" onClick={createAlert}>
            {i18n('create_alert', props.locale)}
          </button>
        </div>

        <div class="alert-list">
          <For each={props.alerts.filter(a => a.symbol === props.symbolTicker)}>
            {alert => (
              <div class={`alert-item ${alert.triggered ? 'triggered' : ''}`}>
                <div class="alert-info">
                  <span class="alert-condition">
                    {i18n(alert.condition, props.locale)}
                  </span>
                  <span class="alert-price">{alert.price}</span>
                </div>
                <button
                  class="alert-remove"
                  onClick={() => props.onRemoveAlert(alert.id)}>
                  ✕
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Evaluate alerts against current price data.
 * Returns triggered alert IDs.
 */
export function evaluateAlerts (
  alerts: AlertConfig[],
  currentPrice: number,
  previousPrice: number
): string[] {
  const triggered: string[] = []

  for (const alert of alerts) {
    if (alert.triggered) continue

    let fire = false
    switch (alert.condition) {
      case 'crosses_above':
        fire = previousPrice <= alert.price && currentPrice > alert.price
        break
      case 'crosses_below':
        fire = previousPrice >= alert.price && currentPrice < alert.price
        break
      case 'reaches':
        fire = Math.abs(currentPrice - alert.price) / alert.price < 0.001
        break
    }

    if (fire) {
      triggered.push(alert.id)
      alert.triggered = true
      alert.callback?.()

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Price Alert', {
          body: `${alert.symbol}: ${alert.condition.replace('_', ' ')} ${alert.price}`,
          icon: undefined
        })
      }
    }
  }

  return triggered
}

export default AlertModal
