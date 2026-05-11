/**
 * Replay Bar widget — playback controls for bar replay mode.
 */

import { Component, createSignal, onCleanup } from 'solid-js'
import i18n from '../../i18n'

export interface ReplayBarProps {
  locale: string
  status: string
  index: number
  total: number
  speed: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onSpeedChange: (speed: number) => void
  onSeek: (index: number) => void
  onExit: () => void
}

const SPEEDS = [
  { value: 2000, label: '0.25x' },
  { value: 1000, label: '0.5x' },
  { value: 500, label: '1x' },
  { value: 250, label: '2x' },
  { value: 100, label: '5x' },
  { value: 50, label: '10x' }
]

const ReplayBar: Component<ReplayBarProps> = props => {
  const progress = () => props.total > 0 ? (props.index / props.total) * 100 : 0
  const currentSpeed = () => SPEEDS.find(s => s.value === props.speed) ?? SPEEDS[2]

  return (
    <div class="klinecharts-pro-replay-bar">
      <div class="replay-controls">
        {/* Step backward */}
        <button
          class="replay-btn"
          title={i18n('step_backward', props.locale)}
          onClick={() => props.onStepBackward()}>
          ⏮
        </button>

        {/* Play / Pause */}
        <button
          class="replay-btn primary"
          onClick={() => props.status === 'playing' ? props.onPause() : props.onPlay()}>
          {props.status === 'playing' ? '⏸' : '▶'}
        </button>

        {/* Step forward */}
        <button
          class="replay-btn"
          title={i18n('step_forward', props.locale)}
          onClick={() => props.onStepForward()}>
          ⏭
        </button>
      </div>

      {/* Progress bar */}
      <div class="replay-progress">
        <div class="replay-progress-track">
          <div
            class="replay-progress-fill"
            style={{ width: `${progress()}%` }}
          />
          <input
            type="range"
            class="replay-progress-slider"
            min={0}
            max={props.total - 1}
            value={props.index}
            onInput={(e) => props.onSeek(parseInt((e.target as HTMLInputElement).value))}
          />
        </div>
        <span class="replay-progress-text">
          {props.index + 1} / {props.total}
        </span>
      </div>

      {/* Speed selector */}
      <div class="replay-speed">
        <select
          value={props.speed}
          onChange={(e) => props.onSpeedChange(parseInt((e.target as HTMLSelectElement).value))}>
          {SPEEDS.map(s => (
            <option value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Exit replay */}
      <button
        class="replay-btn exit"
        onClick={() => props.onExit()}>
        ✕ {i18n('exit_replay', props.locale)}
      </button>
    </div>
  )
}

export default ReplayBar
