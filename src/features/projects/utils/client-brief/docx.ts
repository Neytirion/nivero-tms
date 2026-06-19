import type { BuildClientBriefInput } from './types'
import { buildBriefViewModel } from './view-model'
import {
  darkenRgb,
  downloadBlob,
  formatDate,
  formatNumber,
  hexToRgb,
  normalizeFileSafe,
} from './formatters'

export async function downloadClientBriefDocx(input: BuildClientBriefInput) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')

  const {
    theme,
    generatedAt,
    projectName,
    customer,
    managerName,
    progress,
    risk,
    includeExecutionHealth,
    estimateModules,
    description,
  } = buildBriefViewModel(input)

  const brandInkRgb = darkenRgb(hexToRgb(theme.primaryColor), 0.82)
  const brandInkHex = [brandInkRgb.r, brandInkRgb.g, brandInkRgb.b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')

  const moduleParagraphs = estimateModules.length
    ? estimateModules.flatMap((module, index) => {
      const line = `${index + 1}. ${module.name} | ${formatNumber(module.estimated_hours)}h`
      return [
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: [new TextRun(line)],
        }),
      ]
    })
    : [new Paragraph('Estimate modules are not configured yet.')]

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 120 },
            children: [new TextRun({ text: `${projectName} - Client Brief`, bold: true, color: brandInkHex.toUpperCase() })],
          }),
          new Paragraph({ children: [new TextRun({ text: `Prepared by ${theme.brandName} for ${customer}`, italics: true })], spacing: { after: 180 } }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'Project Snapshot' }),
          ...(includeExecutionHealth
            ? [
              new Paragraph(`Progress: ${progress}%`),
              new Paragraph(`Risk: ${risk}`),
              new Paragraph(`Estimated / Actual: ${formatNumber(input.project.estimated_hours)}h / ${formatNumber(input.project.actual_hours)}h`),
              new Paragraph({ spacing: { after: 160 }, text: `Budget: ${formatNumber(input.project.budget_amount)} NOK` }),
            ]
            : [
              new Paragraph(`Budget: ${formatNumber(input.project.budget_amount)} NOK`),
              new Paragraph(`Estimated Hours: ${formatNumber(input.project.estimated_hours)}h`),
              new Paragraph({ spacing: { after: 160 }, text: `Planned End: ${formatDate(input.project.end_date)}` }),
            ]),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'Description' }),
          new Paragraph({ spacing: { after: 180 }, children: [new TextRun(description)] }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'Delivery Details' }),
          new Paragraph(`Manager: ${managerName}`),
          new Paragraph(`Start: ${formatDate(input.project.start_date)} | End: ${formatDate(input.project.end_date)}`),
          new Paragraph({ spacing: { after: 180 }, text: `Generated: ${generatedAt.toLocaleString('en-GB')}` }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'Team' }),
          new Paragraph({
            spacing: { after: 180 },
            text: input.teamMemberNames.length ? input.teamMemberNames.join(', ') : 'Team will be assigned after approval.',
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'Estimate Modules' }),
          ...moduleParagraphs,
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const safeName = normalizeFileSafe(projectName || 'project')
  const fileName = `${safeName}-client-brief.docx`
  downloadBlob(fileName, blob)
  return fileName
}
