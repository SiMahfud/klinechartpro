/**
 * Bottom Status Bar — timezone clock + Go to Date
 */

import { Component, createSignal, onMount, onCleanup } from 'solid-js'
import i18n from '../../i18n'

export interface BottomBarProps {
  locale: string
  timezone: string
  onGotoDate: (timestamp: number) => void
  onTimezoneClick: () => void
}

function getTimezoneOffset (tz: string): number {
  try {
    const now = new Date()
    const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' })
    const tzStr = now.toLocaleString('en-US', { timeZone: tz })
    return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / (60 * 1000)
  } catch {
    return new Date().getTimezoneOffset() * -1
  }
}

function formatOffsetLabel (offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m > 0 ? ':' + String(m).padStart(2, '0') : ''}`
}

function formatTime (tz: string): string {
  try {
    return new Date().toLocaleTimeString('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch {
    return new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }
}

const BottomBar: Component<BottomBarProps> = props => {
  const [clock, setClock] = createSignal(formatTime(props.timezone))
  const [showDatePicker, setShowDatePicker] = createSignal(false)
  const [dateValue, setDateValue] = createSignal('')
  const [timeValue, setTimeValue] = createSignal('00:00')
  let timerId: ReturnType<typeof setInterval> | null = null
  let datePickerRef: HTMLDivElement | undefined

  onMount(() => {
    timerId = setInterval(() => {
      setClock(formatTime(props.timezone))
    }, 1000)
  })

  onCleanup(() => {
    if (timerId) clearInterval(timerId)
  })

  // Close date picker on click outside
  const handleClickOutside = (e: MouseEvent) => {
    if (datePickerRef && !datePickerRef.contains(e.target as Node)) {
      setShowDatePicker(false)
    }
  }

  onMount(() => document.addEventListener('mousedown', handleClickOutside))
  onCleanup(() => document.removeEventListener('mousedown', handleClickOutside))

  const handleGo = () => {
    const d = dateValue()
    if (!d) return
    const t = timeValue() || '00:00'
    const ts = new Date(`${d}T${t}:00`).getTime()
    if (!isNaN(ts)) {
      props.onGotoDate(ts)
      setShowDatePicker(false)
    }
  }

  const offset = () => getTimezoneOffset(props.timezone)
  const offsetLabel = () => formatOffsetLabel(offset())

  return (
    <div class="klinecharts-pro-bottom-bar">
      {/* Go to Date */}
      <div class="bottom-bar-goto" ref={datePickerRef}>
        <button
          class="bottom-bar-icon-btn"
          title={i18n('goto_date', props.locale)}
          onClick={() => setShowDatePicker(!showDatePicker())}>
          <svg viewBox="0 0 20 20" width="14" height="14">
            <path d="M6,1 L6,3 M14,1 L14,3 M3,7 L17,7 M2,4 L18,4 C18.5523,4 19,4.44772 19,5 L19,17 C19,17.5523 18.5523,18 18,18 L2,18 C1.44772,18 1,17.5523 1,17 L1,5 C1,4.44772 1.44772,4 2,4 Z M5,10 L5,12 L7,12 L7,10 L5,10 Z M9,10 L9,12 L11,12 L11,10 L9,10 Z M13,10 L13,12 L15,12 L15,10 L13,10 Z M5,14 L5,16 L7,16 L7,14 L5,14 Z M9,14 L9,16 L11,16 L11,14 L9,14 Z"
              fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        {showDatePicker() && (
          <div class="goto-date-popup">
            <div class="goto-date-row">
              <input
                type="date"
                value={dateValue()}
                onInput={(e) => setDateValue((e.target as HTMLInputElement).value)}
              />
              <input
                type="time"
                value={timeValue()}
                onInput={(e) => setTimeValue((e.target as HTMLInputElement).value)}
              />
            </div>
            <button class="goto-date-go" onClick={handleGo}>
              Go
            </button>
          </div>
        )}
      </div>

      {/* Separator */}
      <span class="bottom-bar-sep">|</span>

      {/* Timezone Clock */}
      <div class="bottom-bar-clock" onClick={() => props.onTimezoneClick()}>
        <svg viewBox="0 0 16 16" width="12" height="12">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.2" />
          <path d="M8,4 L8,8 L11,10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="clock-time">{clock()}</span>
        <span class="clock-tz">{offsetLabel()}</span>
      </div>
    </div>
  )
}

export default BottomBar
