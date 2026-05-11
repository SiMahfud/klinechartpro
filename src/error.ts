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

export class ChartError extends Error {
  public readonly code: string
  public readonly retryable: boolean

  constructor (message: string, code: string, retryable: boolean = false) {
    super(message)
    this.name = 'ChartError'
    this.code = code
    this.retryable = retryable
  }
}

export class NetworkError extends ChartError {
  constructor (message: string) {
    super(message, 'NETWORK_ERROR', true)
    this.name = 'NetworkError'
  }
}

export class DataError extends ChartError {
  constructor (message: string) {
    super(message, 'DATA_ERROR', true)
    this.name = 'DataError'
  }
}

export class TimeoutError extends ChartError {
  constructor (message: string) {
    super(message, 'TIMEOUT_ERROR', true)
    this.name = 'TimeoutError'
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T> (
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    baseDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
        onRetry?.(attempt, lastError)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Wrap a promise with a timeout
 */
export function withTimeout<T> (promise: Promise<T>, timeoutMs: number, message?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(message ?? `Operation timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then(result => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

export type ErrorHandler = (error: Error) => void

/**
 * Centralized error handler
 */
export class ErrorManager {
  private _handlers: ErrorHandler[] = []
  private _lastError: Error | null = null

  onError (handler: ErrorHandler): () => void {
    this._handlers.push(handler)
    return () => {
      const idx = this._handlers.indexOf(handler)
      if (idx > -1) this._handlers.splice(idx, 1)
    }
  }

  report (error: Error): void {
    this._lastError = error
    console.error('[KLineChartPro]', error)
    this._handlers.forEach(handler => {
      try {
        handler(error)
      } catch (e) {
        console.error('Error in error handler:', e)
      }
    })
  }

  getLastError (): Error | null {
    return this._lastError
  }

  clear (): void {
    this._lastError = null
  }
}
