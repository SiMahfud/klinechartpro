/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, createSignal, For, Show } from 'solid-js'
import { Modal, Input } from '../../component'
import i18n from '../../i18n'
import type { ChartTemplate } from '../../chart-template'
import './index.less'

export interface TemplateModalProps {
  locale: string
  templates: ChartTemplate[]
  onClose: () => void
  onSaveTemplate: (name: string) => void
  onLoadTemplate: (name: string) => void
  onDeleteTemplate: (name: string) => void
}

const TemplateModal: Component<TemplateModalProps> = props => {
  const [templateName, setTemplateName] = createSignal('')

  const handleSave = () => {
    const name = templateName().trim()
    if (name) {
      props.onSaveTemplate(name)
      setTemplateName('')
    }
  }

  return (
    <Modal
      title={i18n('template', props.locale) || 'Chart Templates'}
      width={400}
      onClose={props.onClose}>
      <div class="klinecharts-pro-template-modal-content">
        <div class="template-save-form">
          <Input
            placeholder="Template Name..."
            value={templateName()}
            onChange={v => setTemplateName(String(v))}
          />
          <button class="save-btn" onClick={handleSave}>
            {i18n('save', props.locale) || 'Save'}
          </button>
        </div>
        
        <div class="template-list">
          <Show when={props.templates.length === 0}>
            <div class="no-templates">No templates saved yet.</div>
          </Show>
          <For each={props.templates}>
            {template => (
              <div class="template-item">
                <span 
                  class="template-name" 
                  onClick={() => props.onLoadTemplate(template.name)}>
                  {template.name}
                </span>
                <span class="template-date">
                  {new Date(template.createdAt).toLocaleDateString()}
                </span>
                <button 
                  class="delete-btn" 
                  onClick={() => props.onDeleteTemplate(template.name)}>
                  ✕
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    </Modal>
  )
}

export default TemplateModal
