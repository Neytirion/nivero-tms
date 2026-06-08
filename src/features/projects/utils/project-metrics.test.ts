import { describe, expect, it } from 'vitest'
import { deriveProgress, deriveRisk, deriveRiskFromProgressAndHours, formatDate } from './project-metrics'

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
})