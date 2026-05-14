/**
 * Context Menu component — right-click menu for overlays and chart area.
 * Supports separators, click-outside-to-close, and keyboard (Escape).
 */

import { Component, For, Show, onMount, onCleanup } from 'solid-js'

export interface ContextMenuItem {
  key: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

export interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onSelect: (key: string) => void
  onClose: () => void
}

const ContextMenu: Component<ContextMenuProps> = props => {
  let menuRef: HTMLDivElement | undefined

  // Clamp position so menu doesn't overflow viewport
  const clampedX = () => {
    const menuWidth = 200 // approx min-width
    return Math.min(props.x, window.innerWidth - menuWidth - 8)
  }
  const clampedY = () => {
    const menuHeight = props.items.length * 36 + 16
    return Math.min(props.y, window.innerHeight - menuHeight - 8)
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      props.onClose()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      props.onClose()
    }
  }

  onMount(() => {
    // Use setTimeout to avoid the same click event that opened the menu
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    document.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside)
    document.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div
      ref={menuRef}
      class="klinecharts-pro-context-menu"
      style={{
        position: 'fixed',
        left: `${clampedX()}px`,
        top: `${clampedY()}px`,
        'z-index': '9999'
      }}>
      <ul class="context-menu-list">
        <For each={props.items}>
          {(item) => (
            <Show when={!item.separator} fallback={
              <li class="context-menu-separator" />
            }>
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
            </Show>
          )}
        </For>
      </ul>
    </div>
  )
}

export default ContextMenu
