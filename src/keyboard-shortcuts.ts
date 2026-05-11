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

export interface ShortcutBinding {
  /** e.g. 'ctrl+z', 'alt+s', 'delete', 'escape', '1', 'f11' */
  key: string
  description?: string
  callback: (e: KeyboardEvent) => void
}

/**
 * Parse a key combo string into normalized parts.
 * e.g. 'Ctrl+Shift+Z' → { ctrl: true, shift: true, alt: false, meta: false, key: 'z' }
 */
function parseKeyCombo (combo: string) {
  const parts = combo.toLowerCase().split('+').map(s => s.trim())
  const result = { ctrl: false, shift: false, alt: false, meta: false, key: '' }
  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') result.ctrl = true
    else if (part === 'shift') result.shift = true
    else if (part === 'alt') result.alt = true
    else if (part === 'meta' || part === 'cmd') result.meta = true
    else result.key = part
  }
  return result
}

function matchesEvent (combo: ReturnType<typeof parseKeyCombo>, e: KeyboardEvent): boolean {
  const key = e.key.toLowerCase()
  // Normalize special keys
  const eventKey =
    key === 'escape' ? 'escape' :
    key === 'delete' || key === 'backspace' ? 'delete' :
    key === 'f11' ? 'f11' :
    key

  return (
    combo.ctrl === (e.ctrlKey || e.metaKey) &&
    combo.shift === e.shiftKey &&
    combo.alt === e.altKey &&
    combo.key === eventKey
  )
}

/**
 * Keyboard shortcut manager for chart operations.
 * Listens to keyboard events and dispatches registered callbacks.
 */
export class KeyboardShortcutManager {
  private _bindings: Map<string, ShortcutBinding> = new Map()
  private _parsedBindings: Map<string, ReturnType<typeof parseKeyCombo>> = new Map()
  private _handler: (e: KeyboardEvent) => void
  private _enabled = true

  constructor (private _container?: HTMLElement) {
    this._handler = (e: KeyboardEvent) => {
      if (!this._enabled) return

      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      for (const [id, binding] of this._bindings) {
        const parsed = this._parsedBindings.get(id)
        if (parsed && matchesEvent(parsed, e)) {
          e.preventDefault()
          e.stopPropagation()
          binding.callback(e)
          return
        }
      }
    }

    const target = _container ?? document
    target.addEventListener('keydown', this._handler as EventListener)
  }

  /** Register a keyboard shortcut */
  register (binding: ShortcutBinding): void {
    this._bindings.set(binding.key, binding)
    this._parsedBindings.set(binding.key, parseKeyCombo(binding.key))
  }

  /** Remove a keyboard shortcut */
  remove (key: string): void {
    this._bindings.delete(key)
    this._parsedBindings.delete(key)
  }

  /** Enable/disable all shortcuts */
  setEnabled (enabled: boolean): void {
    this._enabled = enabled
  }

  /** Get all registered bindings */
  getBindings (): ShortcutBinding[] {
    return Array.from(this._bindings.values())
  }

  /** Clean up */
  destroy (): void {
    const target = this._container ?? document
    target.removeEventListener('keydown', this._handler as EventListener)
    this._bindings.clear()
    this._parsedBindings.clear()
  }
}
