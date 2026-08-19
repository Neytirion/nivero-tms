const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/

export const WORK_PACKAGE_COLOR_PALETTE = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
]

export function getDefaultWorkPackageColor(index: number) {
  if (WORK_PACKAGE_COLOR_PALETTE.length === 0) {
    return '#94a3b8'
  }

  const normalizedIndex = ((Math.trunc(index) % WORK_PACKAGE_COLOR_PALETTE.length) + WORK_PACKAGE_COLOR_PALETTE.length) % WORK_PACKAGE_COLOR_PALETTE.length
  return WORK_PACKAGE_COLOR_PALETTE[normalizedIndex]
}

export function normalizeWorkPackageColor(color: string | null | undefined) {
  const candidate = color?.trim() ?? ''

  if (!HEX_COLOR_PATTERN.test(candidate)) {
    return null
  }

  return candidate.toLowerCase()
}

export function getWorkPackageColor(color: string | null | undefined, index: number) {
  return normalizeWorkPackageColor(color) ?? getDefaultWorkPackageColor(index)
}