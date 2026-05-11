/**
 * Drawing Style Editor modal.
 * Allows editing overlay properties: color, width, style, fill.
 */

import { Component, createSignal } from 'solid-js'
import { Modal } from '../../component'
import i18n from '../../i18n'

export interface DrawingStyleEditorProps {
  locale: string
  overlayId: string
  currentStyles: {
    lineColor?: string
    lineWidth?: number
    lineStyle?: string
    fillColor?: string
  }
  onApply: (id: string, styles: DrawingStyleValues) => void
  onClose: () => void
}

export interface DrawingStyleValues {
  lineColor: string
  lineWidth: number
  lineStyle: 'solid' | 'dashed' | 'dotted'
  fillColor: string
}

const COLOR_PRESETS = [
  '#EF5350', '#FF9800', '#FFC107', '#4CAF50', '#26A65B',
  '#2196F3', '#1677FF', '#9C27B0', '#E91E63', '#607D8B',
  '#FFFFFF', '#999999', '#666666', '#333333', '#000000'
]

const LINE_WIDTHS = [1, 1.5, 2, 3, 4]

const DrawingStyleEditor: Component<DrawingStyleEditorProps> = props => {
  const [lineColor, setLineColor] = createSignal(props.currentStyles.lineColor ?? '#1677FF')
  const [lineWidth, setLineWidth] = createSignal(props.currentStyles.lineWidth ?? 1)
  const [lineStyle, setLineStyle] = createSignal(props.currentStyles.lineStyle ?? 'solid')
  const [fillColor, setFillColor] = createSignal(props.currentStyles.fillColor ?? 'rgba(22, 119, 255, 0.15)')

  const handleApply = () => {
    props.onApply(props.overlayId, {
      lineColor: lineColor(),
      lineWidth: lineWidth(),
      lineStyle: lineStyle() as DrawingStyleValues['lineStyle'],
      fillColor: fillColor()
    })
    props.onClose()
  }

  return (
    <Modal
      title={i18n('style_editor', props.locale)}
      width={320}
      onClose={props.onClose}>
      <div class="klinecharts-pro-style-editor">
        {/* Line Color */}
        <div class="style-section">
          <label>{i18n('line_color', props.locale)}</label>
          <div class="color-grid">
            {COLOR_PRESETS.map(color => (
              <span
                class={`color-swatch ${lineColor() === color ? 'selected' : ''}`}
                style={{ 'background-color': color }}
                onClick={() => setLineColor(color)}
              />
            ))}
          </div>
          <input
            type="color"
            value={lineColor()}
            onInput={(e) => setLineColor((e.target as HTMLInputElement).value)}
            class="color-picker"
          />
        </div>

        {/* Line Width */}
        <div class="style-section">
          <label>{i18n('line_width', props.locale)}</label>
          <div class="width-options">
            {LINE_WIDTHS.map(w => (
              <button
                class={`width-btn ${lineWidth() === w ? 'selected' : ''}`}
                onClick={() => setLineWidth(w)}>
                <span
                  class="width-preview"
                  style={{ height: `${w}px` }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Line Style */}
        <div class="style-section">
          <label>{i18n('line_style', props.locale)}</label>
          <div class="style-options">
            <button
              class={`style-btn ${lineStyle() === 'solid' ? 'selected' : ''}`}
              onClick={() => setLineStyle('solid')}>
              ━━━
            </button>
            <button
              class={`style-btn ${lineStyle() === 'dashed' ? 'selected' : ''}`}
              onClick={() => setLineStyle('dashed')}>
              ╌╌╌
            </button>
            <button
              class={`style-btn ${lineStyle() === 'dotted' ? 'selected' : ''}`}
              onClick={() => setLineStyle('dotted')}>
              ┈┈┈
            </button>
          </div>
        </div>

        {/* Fill Color */}
        <div class="style-section">
          <label>{i18n('fill_color', props.locale)}</label>
          <input
            type="color"
            value={fillColor().startsWith('rgba') ? '#1677FF' : fillColor()}
            onInput={(e) => setFillColor((e.target as HTMLInputElement).value + '26')}
            class="color-picker"
          />
        </div>

        {/* Apply button */}
        <div class="style-actions">
          <button class="apply-btn" onClick={handleApply}>
            {i18n('apply', props.locale)}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DrawingStyleEditor
