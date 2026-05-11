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
import type { Styles } from 'klinecharts'

export interface ChartTemplate {
  name: string
  mainIndicators: string[]
  subIndicators: string[]
  styles?: any
  period?: { multiplier: number, timespan: string, text: string }
  theme?: string
  createdAt: number
}

const TEMPLATES_KEY = 'templates'

/**
 * Chart template manager.
 * Save/load indicator + style configurations as reusable presets.
 */
export class ChartTemplateManager {
  private _store: ChartStore

  constructor (store: ChartStore) {
    this._store = store
  }

  /** Save a template */
  saveTemplate (template: ChartTemplate): void {
    const templates = this._getAll()
    const existing = templates.findIndex(t => t.name === template.name)
    if (existing >= 0) {
      templates[existing] = template
    } else {
      templates.push(template)
    }
    this._saveAll(templates)
  }

  /** Load a template by name */
  loadTemplate (name: string): ChartTemplate | null {
    const templates = this._getAll()
    return templates.find(t => t.name === name) ?? null
  }

  /** Delete a template by name */
  deleteTemplate (name: string): void {
    const templates = this._getAll().filter(t => t.name !== name)
    this._saveAll(templates)
  }

  /** Get all template names */
  getTemplateNames (): string[] {
    return this._getAll().map(t => t.name)
  }

  /** Get all templates */
  getTemplates (): ChartTemplate[] {
    return this._getAll()
  }

  private _getAll (): ChartTemplate[] {
    try {
      const raw = localStorage.getItem(`${this._store['_prefix']}:${TEMPLATES_KEY}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private _saveAll (templates: ChartTemplate[]): void {
    try {
      localStorage.setItem(`${this._store['_prefix']}:${TEMPLATES_KEY}`, JSON.stringify(templates))
    } catch (e) {
      console.warn('[ChartTemplateManager] Failed to save templates:', e)
    }
  }
}
