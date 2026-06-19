import { buildBriefViewModel } from './view-model'
import type { BuildClientBriefInput } from './types'
import {
  darkenRgb,
  formatDate,
  formatNumber,
  hexToRgb,
  normalizeFileSafe,
  softenRgb,
  truncateLine,
} from './formatters'
import { loadPdfLogoAsset } from './logo'

export async function downloadClientBriefPdf(input: BuildClientBriefInput) {
  const { jsPDF } = await import('jspdf')
  const {
    theme,
    generatedAt,
    projectName,
    managerName,
    progress,
    risk,
    includeExecutionHealth,
    estimateModules,
    description,
  } = buildBriefViewModel(input)

  const primaryRgb = hexToRgb(theme.primaryColor)
  const accentRgb = hexToRgb(theme.accentColor)
  const softAccentRgb = softenRgb(accentRgb, 0.6)
  const brandInkRgb = darkenRgb(primaryRgb, 0.82)
  const textRgb = hexToRgb(theme.textColor)
  const mutedRgb = hexToRgb(theme.mutedTextColor)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 44
  const contentWidth = pageWidth - margin * 2
  let cursorY = margin

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight < pageHeight - margin) {
      return
    }

    pdf.addPage()
    cursorY = margin
  }

  const logo = await loadPdfLogoAsset(120)

  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  pdf.rect(0, 0, pageWidth, 122, 'F')

  pdf.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
  pdf.rect(0, 0, pageWidth, 10, 'F')

  pdf.setFillColor(softAccentRgb.r, softAccentRgb.g, softAccentRgb.b)
  pdf.circle(pageWidth - 42, -8, 80, 'F')

  if (logo) {
    try {
      pdf.addImage(logo.dataUrl, 'PNG', margin, 16, logo.width, logo.height)
    } catch {
      // Logo adding failed, continue without it
    }
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(24)
  pdf.text(truncateLine(projectName, 70), margin, 69)

  cursorY = 148
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('Project Snapshot', margin, cursorY)

  cursorY += 16
  pdf.setDrawColor(205, 215, 214)
  pdf.setFillColor(248, 249, 245)
  pdf.roundedRect(margin, cursorY, contentWidth, 68, 8, 8, 'FD')

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(mutedRgb.r, mutedRgb.g, mutedRgb.b)
  if (includeExecutionHealth) {
    pdf.text('Progress', margin + 16, cursorY + 20)
    pdf.text('Risk', margin + contentWidth / 3 + 8, cursorY + 20)
    pdf.text('Estimated / Actual', margin + (contentWidth / 3) * 2 + 8, cursorY + 20)
  } else {
    pdf.text('Budget', margin + 16, cursorY + 20)
    pdf.text('Estimated Hours', margin + contentWidth / 3 + 8, cursorY + 20)
    pdf.text('Planned End', margin + (contentWidth / 3) * 2 + 8, cursorY + 20)
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(brandInkRgb.r, brandInkRgb.g, brandInkRgb.b)
  if (includeExecutionHealth) {
    pdf.text(`${progress}%`, margin + 16, cursorY + 42)
    pdf.text(risk, margin + contentWidth / 3 + 8, cursorY + 42)
    pdf.text(`${formatNumber(input.project.estimated_hours)}h / ${formatNumber(input.project.actual_hours)}h`, margin + (contentWidth / 3) * 2 + 8, cursorY + 42)
  } else {
    pdf.text(`${formatNumber(input.project.budget_amount)} NOK`, margin + 16, cursorY + 42)
    pdf.text(`${formatNumber(input.project.estimated_hours)}h`, margin + contentWidth / 3 + 8, cursorY + 42)
    pdf.text(formatDate(input.project.end_date), margin + (contentWidth / 3) * 2 + 8, cursorY + 42)
  }

  cursorY += 92
  ensureSpace(120)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('Description', margin, cursorY)
  cursorY += 16

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(mutedRgb.r, mutedRgb.g, mutedRgb.b)
  const descriptionLines = pdf.splitTextToSize(description, contentWidth)
  pdf.text(descriptionLines, margin, cursorY)
  cursorY += descriptionLines.length * 14 + 10

  ensureSpace(84)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b)
  pdf.text('Delivery Details', margin, cursorY)
  cursorY += 16

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(mutedRgb.r, mutedRgb.g, mutedRgb.b)
  pdf.text(`Manager: ${managerName}`, margin, cursorY)
  cursorY += 14
  pdf.text(`Start: ${formatDate(input.project.start_date)}   End: ${formatDate(input.project.end_date)}`, margin, cursorY)
  cursorY += 14
  pdf.text(`Budget: ${formatNumber(input.project.budget_amount)} NOK`, margin, cursorY)
  cursorY += 20

  ensureSpace(80)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b)
  pdf.text('Team', margin, cursorY)
  cursorY += 16

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(mutedRgb.r, mutedRgb.g, mutedRgb.b)
  const teamLine = input.teamMemberNames.length
    ? input.teamMemberNames.join(', ')
    : 'Team will be assigned after approval.'
  const teamLines = pdf.splitTextToSize(teamLine, contentWidth)
  pdf.text(teamLines, margin, cursorY)
  cursorY += teamLines.length * 14 + 14

  ensureSpace(120)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b)
  pdf.text('Estimate Modules', margin, cursorY)
  cursorY += 14

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(mutedRgb.r, mutedRgb.g, mutedRgb.b)
  if (estimateModules.length === 0) {
    pdf.text('Estimate modules are not configured yet.', margin, cursorY + 4)
    cursorY += 18
  } else {
    estimateModules.forEach((module, index) => {
      ensureSpace(42)
      const line = `${index + 1}. ${truncateLine(module.name, 76)} | ${formatNumber(module.estimated_hours)}h`
      const moduleLines = pdf.splitTextToSize(line, contentWidth)
      pdf.text(moduleLines, margin, cursorY + 4)
      cursorY += moduleLines.length * 13 + 6
    })
  }

  const footer = `Generated: ${generatedAt.toLocaleString('en-GB')}  |  Prepared by ${theme.brandName}`
  pdf.setFontSize(9)
  pdf.setTextColor(mutedRgb.r, mutedRgb.g, mutedRgb.b)
  pdf.text(footer, margin, pageHeight - 24)

  const safeName = normalizeFileSafe(projectName || 'project')
  const fileName = `${safeName}-client-brief.pdf`
  pdf.save(fileName)
  return fileName
}
