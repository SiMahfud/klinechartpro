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

import { ChartStore } from './store'

export interface DrawingAction {
  type: 'add' | 'remove' | 'modify'
  overlay: any
  previousState?: any
}

/**
 * Drawing persistence + undo/redo stack.
 */
export class DrawingStore {
  private _store: ChartStore
  private _undoStack: DrawingAction[] = []
  private _redoStack: DrawingAction[] = []
  private _maxHistory: number = 50

  constructor (store: ChartStore) {
    this._store = store
  }

  // --- Undo / Redo ---
  pushAction (action: DrawingAction): void {
    this._undoStack.push(action)
    if (this._undoStack.length > this._maxHistory) {
      this._undoStack.shift()
    }
    // Clear redo stack on new action
    this._redoStack = []
  }

  canUndo (): boolean {
    return this._undoStack.length > 0
  }

  canRedo (): boolean {
    return this._redoStack.length > 0
  }

  undo (): DrawingAction | null {
    const action = this._undoStack.pop()
    if (action) {
      this._redoStack.push(action)
      return action
    }
    return null
  }

  redo (): DrawingAction | null {
    const action = this._redoStack.pop()
    if (action) {
      this._undoStack.push(action)
      return action
    }
    return null
  }

  // --- Persistence ---
  saveDrawings (ticker: string, drawings: any[]): void {
    this._store.setDrawings(ticker, drawings)
  }

  loadDrawings (ticker: string): any[] {
    return this._store.getDrawings(ticker) ?? []
  }

  // --- Export / Import ---
  exportDrawings (ticker: string): string {
    const drawings = this.loadDrawings(ticker)
    return JSON.stringify({ ticker, drawings, exportedAt: new Date().toISOString() }, null, 2)
  }

  importDrawings (json: string): { ticker: string, drawings: any[] } | null {
    try {
      const data = JSON.parse(json)
      if (data.ticker && Array.isArray(data.drawings)) {
        this.saveDrawings(data.ticker, data.drawings)
        return { ticker: data.ticker, drawings: data.drawings }
      }
      return null
    } catch {
      console.warn('[DrawingStore] Failed to import drawings')
      return null
    }
  }

  clearHistory (): void {
    this._undoStack = []
    this._redoStack = []
  }
}
