export interface PdfLogoAsset {
  dataUrl: string
  width: number
  height: number
}

export async function loadPdfLogoAsset(targetWidth = 120): Promise<PdfLogoAsset | null> {
  try {
    const response = await fetch('/nivero-logo.svg')
    if (!response.ok) {
      return null
    }

    const blob = await response.blob()
    const svgDataUrl = URL.createObjectURL(blob)
    const dpr = 2

    return await new Promise<PdfLogoAsset | null>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        const sourceWidth = img.naturalWidth || 1500
        const sourceHeight = img.naturalHeight || 328
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, sourceWidth * dpr)
        canvas.height = Math.max(1, sourceHeight * dpr)
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          URL.revokeObjectURL(svgDataUrl)
          resolve(null)
          return
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        URL.revokeObjectURL(svgDataUrl)
        resolve({
          dataUrl,
          width: targetWidth,
          height: targetWidth * (sourceHeight / sourceWidth),
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(svgDataUrl)
        resolve(null)
      }

      img.src = svgDataUrl
    })
  } catch {
    return null
  }
}
