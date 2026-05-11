/**
 * Context Menu component — right-click menu for overlays.
 */

import { Component, For } from 'solid-js'

export interface ContextMenuItem {
  key: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
}

export interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onSelect: (key: string) => void
  onClose: () => void
}

const ContextMenu: Component<ContextMenuProps> = props => {
  return (
    <div
      class="klinecharts-pro-context-menu"
      style={{
        position: 'fixed',
        left: `${props.x}px`,
        top: `${props.y}px`,
        'z-index': '9999'
      }}
      onMouseLeave={() => props.onClose()}>
      <ul class="context-menu-list">
        <For each={props.items}>
          {(item) => (
            <li
              class={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={() => {
                if (!item.disabled) {
                  props.onSelect(item.key)
                  props.onClose()
                }
              }}>
              {item.icon && <span class="context-menu-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}

export default ContextMenu
