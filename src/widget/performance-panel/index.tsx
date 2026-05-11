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

export interface PerformancePanelProps {
  visible: boolean
  dataPointCount?: number
  wsLatency?: number
}

const PerformancePanel: Component<PerformancePanelProps> = props => {
  const [fps, setFps] = createSignal(0)
  const [memory, setMemory] = createSignal('N/A')

  let frameCount = 0
  let lastTime = performance.now()
  let rafId: number

  const measureFps = () => {
    frameCount++
    const now = performance.now()
    if (now - lastTime >= 1000) {
      setFps(Math.round(frameCount * 1000 / (now - lastTime)))
      frameCount = 0
      lastTime = now

      // Memory (Chrome only)
      const perf = performance as any
      if (perf.memory) {
        const mb = (perf.memory.usedJSHeapSize / 1048576).toFixed(1)
        setMemory(`${mb} MB`)
      }
    }
    rafId = requestAnimationFrame(measureFps)
  }

  onMount(() => {
    rafId = requestAnimationFrame(measureFps)
  })

  onCleanup(() => {
    cancelAnimationFrame(rafId)
  })

  if (!props.visible) return null

  return (
    <div class="klinecharts-pro-performance-panel">
      <div class="perf-item">
        <span class="perf-label">FPS</span>
        <span class="perf-value" style={{ color: fps() >= 30 ? '#52c41a' : '#ff4d4f' }}>
          {fps()}
        </span>
      </div>
      <div class="perf-item">
        <span class="perf-label">Data</span>
        <span class="perf-value">{props.dataPointCount ?? 0}</span>
      </div>
      <div class="perf-item">
        <span class="perf-label">WS</span>
        <span class="perf-value">
          {props.wsLatency !== undefined ? `${props.wsLatency}ms` : '—'}
        </span>
      </div>
      <div class="perf-item">
        <span class="perf-label">Mem</span>
        <span class="perf-value">{memory()}</span>
      </div>
    </div>
  )
}

export default PerformancePanel
