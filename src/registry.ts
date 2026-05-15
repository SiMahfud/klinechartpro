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

/**
 * Central registry for custom indicators and overlays.
 * When users register custom tools via the public API,
 * they are added here so the UI menus can dynamically display them.
 */

export interface CustomRegistryItem {
  /** Internal name used by klinecharts engine */
  name: string
  /** Display label shown in menus */
  label: string
  /** Whether this is a main chart or sub chart indicator (indicators only) */
  paneType?: 'main' | 'sub'
}

class Registry {
  private _customIndicators: CustomRegistryItem[] = []
  private _customOverlays: CustomRegistryItem[] = []
  private _listeners: Array<() => void> = []

  /** Register a custom indicator for UI display */
  addIndicator (item: CustomRegistryItem): void {
    if (!this._customIndicators.find(i => i.name === item.name)) {
      this._customIndicators.push(item)
      this._notify()
    }
  }

  /** Remove a custom indicator from UI display */
  removeIndicator (name: string): void {
    const initialLength = this._customIndicators.length
    this._customIndicators = this._customIndicators.filter(i => i.name !== name)
    if (this._customIndicators.length !== initialLength) {
      this._notify()
    }
  }

  /** Register a custom overlay for UI display */
  addOverlay (item: CustomRegistryItem): void {
    if (!this._customOverlays.find(o => o.name === item.name)) {
      this._customOverlays.push(item)
      this._notify()
    }
  }

  /** Get all registered custom indicators */
  getCustomIndicators (): CustomRegistryItem[] {
    return [...this._customIndicators]
  }

  /** Get custom indicators filtered by pane type */
  getCustomMainIndicators (): CustomRegistryItem[] {
    return this._customIndicators.filter(i => i.paneType === 'main')
  }

  getCustomSubIndicators (): CustomRegistryItem[] {
    return this._customIndicators.filter(i => i.paneType !== 'main')
  }

  /** Get all registered custom overlays */
  getCustomOverlays (): CustomRegistryItem[] {
    return [...this._customOverlays]
  }

  /** Subscribe to changes (for reactive UI updates) */
  onChange (listener: () => void): () => void {
    this._listeners.push(listener)
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener)
    }
  }

  private _notify (): void {
    this._listeners.forEach(l => l())
  }
}

/** Singleton registry instance */
export const customRegistry = new Registry()
