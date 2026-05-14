/**
 * Replay Overlay — selection mode with vertical line preview
 * Shown when user clicks "Replay" and needs to pick a start candle.
 */

import { Component, onMount, onCleanup, createSignal } from 'solid-js'
import i18n from '../../i18n'

export interface ReplayOverlayProps {
  locale: string
  /** Current crosshair X position in pixels (relative to chart widget) */
  crosshairX: number
  /** Whether the crosshair is currently visible / over the chart */
  crosshairVisible: boolean
  drawingBarVisible: boolean
  onCancel: () => void
}

const ReplayOverlay: Component<ReplayOverlayProps> = props => {
  return (
    <div class="klinecharts-pro-replay-overlay" style={{ left: props.drawingBarVisible ? '52px' : '0px' }}>
      {/* Banner */}
      <div class="replay-overlay-banner">
        <span class="replay-overlay-icon">📍</span>
        <span class="replay-overlay-text">
          {i18n('replay_select_hint', props.locale)}
        </span>
        <button class="replay-overlay-cancel" onClick={props.onCancel}>
          {i18n('cancel', props.locale)}
        </button>
      </div>
      {/* Vertical line that follows cursor */}
      {props.crosshairVisible && props.crosshairX > 0 && (
        <div
          class="replay-overlay-vline"
          style={{ left: `${props.crosshairX}px` }}
        />
      )}
    </div>
  )
}

export default ReplayOverlay
