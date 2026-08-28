import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  deriveBudgetConsumption,
  deriveForecastCompletionDate,
  deriveProgress,
  deriveRisk,
  deriveRiskFromProgressAndHours,
  formatDate,
  countWorkingDays,
} from './project-metrics'

describe('project-metrics', () => {
  describe('deriveProgress', () => {
    it('returns 100 for completed projects', () => {
      expect(
        deriveProgress({
          status: 'completed',
          progress_percent: 45,
          estimated_hours: 100,
          actual_hours: 10,
        }),
      ).toBe(100)
    })

    it('prefers explicit progress_percent when provided', () => {
      expect(
        deriveProgress({
          status: 'active',
          progress_percent: 67.4,
          estimated_hours: 100,
          actual_hours: 10,
        }),
      ).toBe(67)
    })

    it('falls back to actual vs estimated ratio', () => {
      expect(
        deriveProgress({
          status: 'active',
          progress_percent: null,
          estimated_hours: 40,
          actual_hours: 10,
        }),
      ).toBe(25)
    })

    it('returns 0 when there is not enough data', () => {
      expect(
        deriveProgress({
          status: 'active',
          progress_percent: null,
          estimated_hours: 0,
          actual_hours: 10,
        }),
      ).toBe(0)
    })
  })

  describe('deriveRisk', () => {
    it('normalizes explicit red risk', () => {
      expect(
        deriveRisk({
          risk_status: 'red',
          progress_percent: null,
          estimated_hours: 100,
          actual_hours: 50,
          start_date: null,
          end_date: null,
        }),
      ).toBe('Red')
    })

    it('computes amber when actual reaches 85 percent of estimate', () => {
      expect(
        deriveRisk({
          risk_status: null,
          progress_percent: null,
          estimated_hours: 100,
          actual_hours: 85,
          start_date: null,
          end_date: null,
        }),
      ).toBe('Amber')
    })

    it('computes red when actual exceeds estimate', () => {
      expect(
        deriveRisk({
          risk_status: null,
          progress_percent: null,
          estimated_hours: 100,
          actual_hours: 101,
          start_date: null,
          end_date: null,
        }),
      ).toBe('Red')
    })

    it('computes red when burn is far ahead of progress', () => {
      expect(
        deriveRisk({
          risk_status: null,
          progress_percent: 20,
          estimated_hours: 100,
          actual_hours: 60,
          start_date: null,
          end_date: null,
        }),
      ).toBe('Red')
    })

    it('keeps green when progress is ahead of burn', () => {
      expect(
        deriveRisk({
          risk_status: null,
          progress_percent: 90,
          estimated_hours: 100,
          actual_hours: 85,
          start_date: null,
          end_date: null,
        }),
      ).toBe('Green')
    })
  })

  describe('deriveRiskFromProgressAndHours', () => {
    it('returns amber when burn is moderately ahead of progress', () => {
      expect(
        deriveRiskFromProgressAndHours({
          progressPercent: 70,
          estimatedHours: 100,
          actualHours: 85,
        }),
      ).toBe('Amber')
    })
  })

  describe('formatDate', () => {
    it('returns fallback text for empty values', () => {
      expect(formatDate(null)).toBe('Not set')
    })
  })

  describe('deriveForecastCompletionDate', () => {
    it('returns null when progress is zero', () => {
      expect(
        deriveForecastCompletionDate({
          status: 'active',
          start_date: '2026-06-01',
          end_date: '2026-06-30',
          progress_percent: 0,
          estimated_hours: 100,
          actual_hours: 0,
        }),
      ).toBeNull()
    })

    it('returns null when start_date is in the future', () => {
      expect(
        deriveForecastCompletionDate({
          status: 'active',
          start_date: '2999-01-01',
          end_date: '2999-06-30',
          progress_percent: 40,
          estimated_hours: 100,
          actual_hours: 30,
        }),
      ).toBeNull()
    })

    it('returns end_date for completed projects', () => {
      expect(
        deriveForecastCompletionDate({
          status: 'completed',
          start_date: '2026-06-01',
          end_date: '2026-06-20',
          progress_percent: 100,
          estimated_hours: 100,
          actual_hours: 100,
        }),
      ).toBe('2026-06-20')
    })

    it('projects a future date when project is in progress', () => {
      const result = deriveForecastCompletionDate({
        status: 'active',
        start_date: '2026-06-01',
        end_date: '2026-06-30',
        progress_percent: 50,
        estimated_hours: 100,
        actual_hours: 50,
      })

      expect(result).not.toBeNull()
      expect(result! > '2026-06-15').toBe(true)
    })
  })

  describe('deriveBudgetConsumption', () => {
    it('calculates spent amount and burn percent correctly', () => {
      expect(
        deriveBudgetConsumption({
          budget_amount: 10000,
          estimated_hours: 100,
          actual_hours: 25,
        }),
      ).toEqual({ spentAmount: 2500, budgetAmount: 10000, burnPercent: 25 })
    })

    it('returns null when budget is not set', () => {
      expect(
        deriveBudgetConsumption({
          budget_amount: null,
          estimated_hours: 100,
          actual_hours: 25,
        }),
      ).toBeNull()
    })

    it('returns null when estimated hours are zero', () => {
      expect(
        deriveBudgetConsumption({
          budget_amount: 10000,
          estimated_hours: 0,
          actual_hours: 10,
        }),
      ).toBeNull()
    })
  })

  describe('countWorkingDays', () => {
    it('counts working days correctly for a full week', () => {
      // 2026-06-01 is Monday, 2026-06-05 is Friday = 5 days
      expect(countWorkingDays('2026-06-01', '2026-06-05')).toBe(5)
    })

    it('excludes weekends', () => {
      // 2026-06-01 (Mon) to 2026-06-08 (Mon) = 6 working days (Mon-Fri, skip Sat/Sun)
      expect(countWorkingDays('2026-06-01', '2026-06-08')).toBe(6)
    })

    it('returns 1 for a single day on weekday', () => {
      // 2026-06-01 is Monday
      expect(countWorkingDays('2026-06-01', '2026-06-01')).toBe(1)
    })

    it('returns 0 for a weekend day', () => {
      // 2026-06-06 is Saturday
      expect(countWorkingDays('2026-06-06', '2026-06-06')).toBe(0)
    })

    it('returns 0 for null dates', () => {
      expect(countWorkingDays(null, '2026-06-05')).toBe(0)
      expect(countWorkingDays('2026-06-01', null)).toBe(0)
      expect(countWorkingDays(null, null)).toBe(0)
    })

    it('handles invalid date strings', () => {
      expect(countWorkingDays('invalid', '2026-06-05')).toBe(0)
      expect(countWorkingDays('2026-06-01', 'invalid')).toBe(0)
    })
  })

  describe('deriveRiskFromProgressAndHours with dates', () => {
    // Mock today's date for consistent testing
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-10').getTime()) // Wednesday
    })

    it('returns Green when on track with working day-based calculation', () => {
      // Project: 2026-06-01 (Mon) to 2026-06-30 (Tue) = 22 working days
      // Estimated: 100 hours = 4.55 hours/day
      // Elapsed: 2026-06-01 to 2026-06-10 = 8 working days = 36.36 hours required
      // Actual: 36 hours = 98.9% of required > 90% threshold = Green
      expect(
        deriveRiskFromProgressAndHours({
          progressPercent: null,
          estimatedHours: 100,
          actualHours: 36,
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        }),
      ).toBe('Green')
    })

    it('returns Amber when moderately behind on working day-based calculation', () => {
      // Actual: 30 hours = 82.4% of 36.36 required
      // Between 80% and 90% threshold = Amber
      expect(
        deriveRiskFromProgressAndHours({
          progressPercent: null,
          estimatedHours: 100,
          actualHours: 30,
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        }),
      ).toBe('Amber')
    })

    it('returns Red when significantly behind on working day-based calculation', () => {
      // Project: 2026-06-01 (Mon) to 2026-06-30
      // Estimated: 100 hours = 4.55 hours/day
      // Elapsed: 8 working days = 36.36 hours required
      // Actual: 28 hours = 76.9% of required < 80% threshold = Red
      expect(
        deriveRiskFromProgressAndHours({
          progressPercent: null,
          estimatedHours: 100,
          actualHours: 28,
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        }),
      ).toBe('Red')
    })

    it('returns Green when ahead on working day-based calculation', () => {
      // Project: 2026-06-01 to 2026-06-30
      // Estimated: 100 hours = 4.55 hours/day
      // Elapsed: 8 working days = 36.36 hours required
      // Actual: 42 hours = 115.4% of required > 90% threshold = Green
      expect(
        deriveRiskFromProgressAndHours({
          progressPercent: null,
          estimatedHours: 100,
          actualHours: 42,
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        }),
      ).toBe('Green')
    })

    it('returns Green when project is in future', () => {
      // Project hasn't started yet
      expect(
        deriveRiskFromProgressAndHours({
          progressPercent: null,
          estimatedHours: 100,
          actualHours: 0,
          startDate: '2026-07-01',
          endDate: '2026-07-31',
        }),
      ).toBe('Green')
    })
  })
})