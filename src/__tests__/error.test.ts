import { describe, it, expect, vi } from 'vitest'
import { withRetry, withTimeout, TimeoutError, ErrorManager } from '../error'

describe('withRetry', () => {
  it('should return on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok')

    const result = await withRetry(fn, { maxAttempts: 3, baseDelay: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    await expect(
      withRetry(fn, { maxAttempts: 2, baseDelay: 10 })
    ).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should call onRetry callback', async () => {
    const onRetry = vi.fn()
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok')

    await withRetry(fn, { maxAttempts: 2, baseDelay: 10, onRetry })
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })
})

describe('withTimeout', () => {
  it('should resolve if promise completes in time', async () => {
    const promise = new Promise(resolve => setTimeout(() => resolve('done'), 10))
    const result = await withTimeout(promise, 1000)
    expect(result).toBe('done')
  })

  it('should reject with TimeoutError if too slow', async () => {
    const promise = new Promise(resolve => setTimeout(() => resolve('done'), 5000))
    await expect(withTimeout(promise, 10)).rejects.toBeInstanceOf(TimeoutError)
  })
})

describe('ErrorManager', () => {
  it('should notify handlers on error', () => {
    const mgr = new ErrorManager()
    const handler = vi.fn()
    mgr.onError(handler)

    const err = new Error('test')
    mgr.report(err)

    expect(handler).toHaveBeenCalledWith(err)
    expect(mgr.getLastError()).toBe(err)
  })

  it('should unsubscribe handler', () => {
    const mgr = new ErrorManager()
    const handler = vi.fn()
    const unsub = mgr.onError(handler)
    unsub()

    mgr.report(new Error('test'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('should clear last error', () => {
    const mgr = new ErrorManager()
    mgr.report(new Error('test'))
    mgr.clear()
    expect(mgr.getLastError()).toBeNull()
  })
})
