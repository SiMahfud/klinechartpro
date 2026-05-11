import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} })
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Now import after mock
import { ChartStore } from '../store'

describe('ChartStore', () => {
  let store: ChartStore

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    store = new ChartStore(true, 'test')
  })

  describe('theme', () => {
    it('should return null when no theme stored', () => {
      expect(store.getTheme()).toBeNull()
    })

    it('should store and retrieve theme', () => {
      store.setTheme('dark')
      expect(store.getTheme()).toBe('dark')
    })
  })

  describe('locale', () => {
    it('should store and retrieve locale', () => {
      store.setLocale('en-US')
      expect(store.getLocale()).toBe('en-US')
    })
  })

  describe('symbol', () => {
    it('should store and retrieve symbol', () => {
      const symbol = { ticker: 'AAPL', name: 'Apple Inc.' }
      store.setSymbol(symbol)
      expect(store.getSymbol()).toEqual(symbol)
    })
  })

  describe('period', () => {
    it('should store and retrieve period', () => {
      const period = { multiplier: 1, timespan: 'day', text: 'D' }
      store.setPeriod(period)
      expect(store.getPeriod()).toEqual(period)
    })
  })

  describe('alerts', () => {
    it('should start with empty alerts', () => {
      expect(store.getAlerts()).toEqual([])
    })

    it('should add and retrieve alerts', () => {
      const alert = {
        id: 'test1',
        symbol: 'AAPL',
        condition: 'crosses_above' as const,
        price: 200,
        triggered: false
      }
      store.addAlert(alert)
      expect(store.getAlerts()).toHaveLength(1)
      expect(store.getAlerts()[0].id).toBe('test1')
    })

    it('should remove alerts by id', () => {
      store.addAlert({ id: 'a1', symbol: 'X', condition: 'reaches', price: 100 })
      store.addAlert({ id: 'a2', symbol: 'Y', condition: 'reaches', price: 200 })
      store.removeAlert('a1')
      expect(store.getAlerts()).toHaveLength(1)
      expect(store.getAlerts()[0].id).toBe('a2')
    })
  })

  describe('disabled store', () => {
    it('should return null for all getters when disabled', () => {
      const disabled = new ChartStore(false)
      disabled.setTheme('dark')
      expect(disabled.getTheme()).toBeNull()
    })
  })

  describe('clear', () => {
    it('should clear all stored data', () => {
      store.setTheme('dark')
      store.setLocale('en-US')
      store.clear()
      expect(store.getTheme()).toBeNull()
      expect(store.getLocale()).toBeNull()
    })
  })
})
