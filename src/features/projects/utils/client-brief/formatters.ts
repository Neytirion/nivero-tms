export function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim()
  const full = normalized.length === 3
    ? normalized.split('').map((value) => `${value}${value}`).join('')
    : normalized

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return { r: 15, g: 76, b: 77 }
  }

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

export function softenRgb(rgb: { r: number; g: number; b: number }, intensity: number) {
  const factor = Math.max(0, Math.min(1, intensity))
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * factor),
    g: Math.round(rgb.g + (255 - rgb.g) * factor),
    b: Math.round(rgb.b + (255 - rgb.b) * factor),
  }
}

export function darkenRgb(rgb: { r: number; g: number; b: number }, intensity: number) {
  const factor = Math.max(0, Math.min(1, intensity))
  return {
    r: Math.round(rgb.r * (1 - factor)),
    g: Math.round(rgb.g * (1 - factor)),
    b: Math.round(rgb.b * (1 - factor)),
  }
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function formatNumber(value: number | null | undefined) {
  return (value ?? 0).toFixed(1)
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not set'
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function normalizeFileSafe(value: string) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
    .slice(0, 60)
}

export function truncateLine(value: string, max = 110) {
  if (value.length <= max) {
    return value
  }

  return `${value.slice(0, max - 3)}...`
}

export function downloadBlob(fileName: string, blob: Blob) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(objectUrl)
}
