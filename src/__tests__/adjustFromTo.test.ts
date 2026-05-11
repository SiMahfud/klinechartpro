import { describe, it, expect } from 'vitest'

/**
 * Test the adjustFromTo function logic.
 * Since it's defined inside a component, we recreate the logic here for unit testing.
 */

interface Period {
  multiplier: number
  timespan: string
  text: string
}

function adjustFromTo (period: Period, toTimestamp: number, count: number): [number, number] {
  let to = toTimestamp
  let from = to
  switch (period.timespan) {
    case 'minute': {
      to = to - (to % (60 * 1000))
      from = to - count * period.multiplier * 60 * 1000
      break
    }
    case 'hour': {
      to = to - (to % (60 * 60 * 1000))
      from = to - count * period.multiplier * 60 * 60 * 1000
      break
    }
    case 'day': {
      to = to - (to % (24 * 60 * 60 * 1000))
      from = to - count * period.multiplier * 24 * 60 * 60 * 1000
      break
    }
    case 'week': {
      const date = new Date(to)
      const week = date.getDay()
      const dif = week === 0 ? 6 : week - 1
      to = to - dif * 24 * 60 * 60 * 1000
      const newDate = new Date(to)
      to = new Date(`${newDate.getFullYear()}-${newDate.getMonth() + 1}-${newDate.getDate()}`).getTime()
      from = to - count * period.multiplier * 7 * 24 * 60 * 60 * 1000
      break
    }
    case 'month': {
      const date = new Date(to)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      to = new Date(`${year}-${month}-01`).getTime()
      from = to - count * period.multiplier * 30 * 24 * 60 * 60 * 1000
      const fromDate = new Date(from)
      from = new Date(`${fromDate.getFullYear()}-${fromDate.getMonth() + 1}-01`).getTime()
      break
    }
    case 'year': {
      const date = new Date(to)
      const year = date.getFullYear()
      to = new Date(`${year}-01-01`).getTime()
      from = to - count * period.multiplier * 365 * 24 * 60 * 60 * 1000
      const fromDate = new Date(from)
      from = new Date(`${fromDate.getFullYear()}-01-01`).getTime()
      break
    }
  }
  return [from, to]
}

describe('adjustFromTo', () => {
  describe('minute', () => {
    it('should truncate to minute boundary', () => {
      const ts = new Date('2026-05-10T12:34:56.789Z').getTime()
      const [from, to] = adjustFromTo({ multiplier: 1, timespan: 'minute', text: '1m' }, ts, 500)
      expect(to % (60 * 1000)).toBe(0)
      expect(to).toBeLessThanOrEqual(ts)
      expect(from).toBeLessThan(to)
    })

    it('should handle 5-minute multiplier', () => {
      const ts = new Date('2026-05-10T12:00:00Z').getTime()
      const [from, to] = adjustFromTo({ multiplier: 5, timespan: 'minute', text: '5m' }, ts, 100)
      const diff = to - from
      expect(diff).toBe(100 * 5 * 60 * 1000)
    })
  })

  describe('hour', () => {
    it('should truncate to hour boundary', () => {
      const ts = new Date('2026-05-10T12:34:56Z').getTime()
      const [from, to] = adjustFromTo({ multiplier: 1, timespan: 'hour', text: '1H' }, ts, 500)
      expect(to % (60 * 60 * 1000)).toBe(0)
      expect(from).toBeLessThan(to)
    })
  })

  describe('day', () => {
    it('should truncate to day boundary', () => {
      const ts = new Date('2026-05-10T15:00:00Z').getTime()
      const [from, to] = adjustFromTo({ multiplier: 1, timespan: 'day', text: 'D' }, ts, 30)
      expect(to % (24 * 60 * 60 * 1000)).toBe(0)
      expect(from).toBeLessThan(to)
    })

    it('from should be exactly 30 days before to', () => {
      const ts = new Date('2026-05-10T00:00:00Z').getTime()
      const [from, to] = adjustFromTo({ multiplier: 1, timespan: 'day', text: 'D' }, ts, 30)
      const diff = to - from
      expect(diff).toBe(30 * 24 * 60 * 60 * 1000)
    })
  })

  describe('week', () => {
    it('from should be before to', () => {
      const ts = new Date('2026-05-10T12:00:00Z').getTime()
      const [from, to] = adjustFromTo({ multiplier: 1, timespan: 'week', text: 'W' }, ts, 52)
      expect(from).toBeLessThan(to)
      // from should be roughly 52 weeks before to
      const diffWeeks = (to - from) / (7 * 24 * 60 * 60 * 1000)
      expect(diffWeeks).toBe(52)
    })

    it('should not produce epoch-level from', () => {
      const ts = new Date('2026-05-10T12:00:00Z').getTime()
      const [from] = adjustFromTo({ multiplier: 1, timespan: 'week', text: 'W' }, ts, 500)
      // from should be in recent years, NOT near epoch (1970)
      const fromYear = new Date(from).getFullYear()
      expect(fromYear).toBeGreaterThan(2000)
    })
  })

  describe('month', () => {
    it('from should be before to and in reasonable range', () => {
      const ts = new Date('2026-05-10T12:00:00Z').getTime()
      const [from, to] = adjustFromTo({ multiplier: 1, timespan: 'month', text: 'M' }, ts, 24)
      expect(from).toBeLessThan(to)
      const fromYear = new Date(from).getFullYear()
      expect(fromYear).toBeGreaterThan(2000)
    })

    it('to should be truncated to first of month', () => {
      const ts = new Date('2026-05-15T12:00:00Z').getTime()
      const [, to] = adjustFromTo({ multiplier: 1, timespan: 'month', text: 'M' }, ts, 12)
      const toDate = new Date(to)
      expect(toDate.getDate()).toBe(1)
    })
  })

  describe('year', () => {
    it('from should be before to and in reasonable range', () => {
      const ts = new Date('2026-05-10T12:00:00Z').getTime()
      const [from, to] = adjustFromTo({ multiplier: 1, timespan: 'year', text: 'Y' }, ts, 10)
      expect(from).toBeLessThan(to)
      const fromYear = new Date(from).getFullYear()
      expect(fromYear).toBeGreaterThan(2000)
    })

    it('to should be truncated to Jan 1st', () => {
      const ts = new Date('2026-07-15T12:00:00Z').getTime()
      const [, to] = adjustFromTo({ multiplier: 1, timespan: 'year', text: 'Y' }, ts, 5)
      const toDate = new Date(to)
      expect(toDate.getMonth()).toBe(0)
      expect(toDate.getDate()).toBe(1)
    })
  })
})
