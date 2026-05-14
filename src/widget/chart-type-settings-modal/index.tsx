/**
 * Chart Type Settings Modal
 * Allows configuration of Renko brick size and Range Bar range size.
 */

import { Component, createSignal, Show } from 'solid-js'
import { Modal } from '../../component'
import i18n from '../../i18n'

export interface ChartTypeSettingsModalProps {
  locale: string
  chartType: string
  currentSize: number
  autoSize: number
  onConfirm: (size: number) => void
  onClose: () => void
}

const ChartTypeSettingsModal: Component<ChartTypeSettingsModalProps> = props => {
  const [useAuto, setUseAuto] = createSignal(props.currentSize <= 0)
  const [manualSize, setManualSize] = createSignal(
    props.currentSize > 0 ? props.currentSize : props.autoSize
  )

  const title = () => {
    return props.chartType === 'renko'
      ? `${i18n('renko', props.locale)} - ${i18n('chart_type_settings', props.locale)}`
      : `${i18n('range_bar', props.locale)} - ${i18n('chart_type_settings', props.locale)}`
  }

  const sizeLabel = () => {
    return props.chartType === 'renko'
      ? i18n('brick_size', props.locale)
      : i18n('range_size', props.locale)
  }

  const handleConfirm = () => {
    props.onConfirm(useAuto() ? 0 : manualSize())
    props.onClose()
  }

  return (
    <Modal
      title={title()}
      width={400}
      onClose={props.onClose}
      buttons={[
        {
          children: i18n('cancel', props.locale),
          onClick: props.onClose
        },
        {
          type: 'confirm',
          children: i18n('confirm', props.locale),
          onClick: handleConfirm
        }
      ]}
    >
      <div class="klinecharts-pro-chart-type-settings-modal-content">
        <div class="setting-row">
          <label class="setting-label">{sizeLabel()}</label>
          <div class="setting-input-group">
            <label class="auto-checkbox">
              <input
                type="checkbox"
                checked={useAuto()}
                onChange={(e) => setUseAuto((e.target as HTMLInputElement).checked)}
              />
              <span>{i18n('auto', props.locale)}</span>
            </label>
            <Show when={!useAuto()}>
              <input
                type="number"
                class="size-input"
                value={manualSize()}
                min={0.00001}
                step="any"
                onInput={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value)
                  if (!isNaN(val) && val > 0) setManualSize(val)
                }}
              />
            </Show>
            <Show when={useAuto()}>
              <span class="auto-value">
                ≈ {props.autoSize.toFixed(
                  props.autoSize < 1 ? 5 : props.autoSize < 100 ? 2 : 0
                )}
              </span>
            </Show>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ChartTypeSettingsModal

