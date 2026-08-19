import { describe, expect, it } from 'vitest'
import {
  getDefaultWorkPackageColor,
  getWorkPackageColor,
  normalizeWorkPackageColor,
  WORK_PACKAGE_COLOR_PALETTE,
} from './work-package-colors'

describe('work package colors', () => {
  it('assigns deterministic defaults by index order', () => {
    expect(getDefaultWorkPackageColor(0)).toBe(WORK_PACKAGE_COLOR_PALETTE[0])
    expect(getDefaultWorkPackageColor(1)).toBe(WORK_PACKAGE_COLOR_PALETTE[1])
    expect(getDefaultWorkPackageColor(2)).toBe(WORK_PACKAGE_COLOR_PALETTE[2])
  })

  it('cycles defaults after palette length', () => {
    expect(getDefaultWorkPackageColor(WORK_PACKAGE_COLOR_PALETTE.length)).toBe(WORK_PACKAGE_COLOR_PALETTE[0])
  })

  it('normalizes valid hex colors and rejects invalid values', () => {
    expect(normalizeWorkPackageColor('#ABCDEF')).toBe('#abcdef')
    expect(normalizeWorkPackageColor(' #123456 ')).toBe('#123456')
    expect(normalizeWorkPackageColor('')).toBeNull()
    expect(normalizeWorkPackageColor('#12345')).toBeNull()
    expect(normalizeWorkPackageColor('#1234567')).toBeNull()
  })

  it('keeps explicit valid color and falls back to default for invalid', () => {
    expect(getWorkPackageColor('#0F0F0F', 3)).toBe('#0f0f0f')
    expect(getWorkPackageColor('invalid-color', 3)).toBe(WORK_PACKAGE_COLOR_PALETTE[3])
  })
})