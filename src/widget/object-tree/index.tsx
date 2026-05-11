/**
 * Object Tree modal — lists all active overlays on the chart.
 * Toggle visibility, delete, or select overlays.
 */

import { Component, createSignal, onMount, For } from 'solid-js'
import { Modal, List } from '../../component'
import i18n from '../../i18n'

export interface OverlayItem {
  id: string
  name: string
  visible: boolean
  groupId?: string
  paneId?: string
}

export interface ObjectTreeProps {
  locale: string
  overlays: OverlayItem[]
  onToggleVisibility: (id: string, visible: boolean) => void
  onRemove: (id: string) => void
  onSelect: (id: string) => void
  onClose: () => void
}

const OVERLAY_LABELS: Record<string, string> = {
  horizontalStraightLine: '━ Horizontal Line',
  horizontalRayLine: '→ Horizontal Ray',
  horizontalSegment: '─ Horizontal Segment',
  verticalStraightLine: '┃ Vertical Line',
  verticalRayLine: '↓ Vertical Ray',
  verticalSegment: '│ Vertical Segment',
  straightLine: '╲ Straight Line',
  rayLine: '↗ Ray Line',
  segment: '╱ Segment',
  arrow: '→ Arrow',
  priceLine: '$ Price Line',
  priceChannelLine: '⊞ Price Channel',
  parallelStraightLine: '═ Parallel Line',
  fibonacciLine: '𝑓 Fibonacci Line',
  fibonacciSegment: '𝑓 Fibonacci Segment',
  fibonacciCircle: '◎ Fibonacci Circle',
  fibonacciSpiral: '🌀 Fibonacci Spiral',
  fibonacciSpeedResistanceFan: '扇 Fibonacci Fan',
  fibonacciExtension: '𝑓 Fibonacci Extension',
  gannBox: '⊞ Gann Box',
  circle: '○ Circle',
  rect: '□ Rectangle',
  triangle: '△ Triangle',
  parallelogram: '▱ Parallelogram',
  threeWaves: '∿ Three Waves',
  fiveWaves: '∿ Five Waves',
  eightWaves: '∿ Eight Waves',
  anyWaves: '∿ Any Waves',
  abcd: '◇ ABCD',
  xabcd: '◇ XABCD',
  longPosition: '📈 Long Position',
  shortPosition: '📉 Short Position',
  frvp: '📊 Volume Profile',
  measure: '📏 Measure',
  priceRange: '🔷 Price Range',
  textNote: '📝 Text Note',
  anchoredVwap: '⚓ Anchored VWAP',
  priceLabel: '🏷️ Price Label'
}

function getOverlayLabel (name: string): string {
  return OVERLAY_LABELS[name] ?? name
}

const ObjectTree: Component<ObjectTreeProps> = props => {
  return (
    <Modal
      title={i18n('object_tree', props.locale)}
      width={360}
      onClose={props.onClose}>
      <List class="klinecharts-pro-object-tree-list">
        {props.overlays.length === 0 && (
          <li class="empty">{i18n('no_overlays', props.locale)}</li>
        )}
        <For each={props.overlays}>
          {(item) => (
            <li class="object-tree-row">
              <span
                class="object-tree-name"
                onClick={() => props.onSelect(item.id)}>
                {getOverlayLabel(item.name)}
              </span>
              <span class="object-tree-actions">
                <button
                  class={`object-tree-btn ${item.visible ? 'visible' : 'hidden'}`}
                  title={item.visible ? 'Hide' : 'Show'}
                  onClick={() => props.onToggleVisibility(item.id, !item.visible)}>
                  {item.visible ? '👁' : '👁‍🗨'}
                </button>
                <button
                  class="object-tree-btn delete"
                  title="Delete"
                  onClick={() => props.onRemove(item.id)}>
                  🗑
                </button>
              </span>
            </li>
          )}
        </For>
      </List>
    </Modal>
  )
}

export default ObjectTree
