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

import { Component } from 'solid-js'
import i18n from '../../i18n'

export interface ErrorBannerProps {
  locale: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

const ErrorBanner: Component<ErrorBannerProps> = props => {
  return (
    <div class="klinecharts-pro-error-banner">
      <div class="error-content">
        <svg viewBox="0 0 24 24" class="error-icon">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="none"/>
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
        </svg>
        <span class="error-message">{props.message}</span>
      </div>
      <div class="error-actions">
        {props.onRetry && (
          <button class="retry-btn" onClick={props.onRetry}>
            {i18n('retry', props.locale)}
          </button>
        )}
        {props.onDismiss && (
          <button class="dismiss-btn" onClick={props.onDismiss}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export default ErrorBanner
