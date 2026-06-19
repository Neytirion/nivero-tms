import type { ProjectPreview, TaskPreview } from '../../../lib/pm'
import { getProjectTaskWorkPackages } from '../../../lib/pm'
import { deriveProgress, deriveRisk } from './project-metrics'

interface ClientBriefTheme {
  brandName: string
  primaryColor: string
  accentColor: string
  surfaceColor: string
  textColor: string
  mutedTextColor: string
}

interface BuildClientBriefInput {
  project: ProjectPreview
  tasks: TaskPreview[]
  estimateModules?: Array<{
    name: string
    estimated_hours: number | null
  }>
  teamMemberNames: string[]
  projectManagerName?: string
  generatedAt?: Date
  theme?: ClientBriefTheme
}

export type ClientBriefExportFormat = 'html' | 'pdf' | 'docx'

const DEFAULT_THEME: ClientBriefTheme = {
  brandName: 'Nivero',
  primaryColor: '#0f766e',
  accentColor: '#fb923c',
  surfaceColor: '#f8fafc',
  textColor: '#0f172a',
  mutedTextColor: '#475569',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatNumber(value: number | null | undefined) {
  return (value ?? 0).toFixed(1)
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not set'
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function normalizeFileSafe(value: string) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
    .slice(0, 60)
}

function getEstimateModules(input: BuildClientBriefInput) {
  return (input.estimateModules ?? [])
    .filter((item) => item.name.trim().length > 0)
    .slice(0, 12)
}

function hasProjectExecutionSignals(project: ProjectPreview, tasks: TaskPreview[]) {
  const progress = deriveProgress(project)
  const actualHours = project.actual_hours ?? 0
  const projectStatus = (project.status ?? '').toLowerCase()
  const activeTaskStatuses = new Set(['in_progress', 'review', 'done', 'completed'])

  if (projectStatus === 'in_progress' || projectStatus === 'review' || projectStatus === 'completed') {
    return true
  }

  if (actualHours > 0 || progress > 0) {
    return true
  }

  return tasks.some((task) => {
    const status = (task.status ?? '').toLowerCase()
    const taskActualHours = task.actual_hours ?? 0
    return activeTaskStatuses.has(status) || taskActualHours > 0
  })
}

function truncateLine(value: string, max = 110) {
  if (value.length <= max) {
    return value
  }

  return `${value.slice(0, max - 3)}...`
}

export function buildClientBriefHtml(input: BuildClientBriefInput) {
  const theme = input.theme ?? DEFAULT_THEME
  const generatedAt = input.generatedAt ?? new Date()
  const projectName = input.project.name || 'Project'
  const progress = deriveProgress(input.project)
  const risk = deriveRisk(input.project)
  const includeExecutionHealth = hasProjectExecutionSignals(input.project, input.tasks)
  const estimateModules = getEstimateModules(input)
  const customer = input.project.customer_name ?? 'Confidential'
  const managerName = input.projectManagerName ?? 'Not assigned'
  const description = input.project.description ?? 'This proposal outlines the project scope, delivery milestones, and execution approach.'

  const estimateModuleRows = estimateModules
    .map((module) => {
      const title = escapeHtml(module.name)
      const estimate = formatNumber(module.estimated_hours)
      return `<tr><td>${title}</td><td>${estimate}h</td></tr>`
    })
    .join('')

  const teamChips = input.teamMemberNames.length
    ? input.teamMemberNames
      .map((name) => `<span class="chip">${escapeHtml(name)}</span>`)
      .join('')
    : '<span class="muted">Team will be assigned after approval.</span>'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(projectName)} - Client Brief</title>
    <style>
      :root {
        --primary: ${theme.primaryColor};
        --accent: ${theme.accentColor};
        --surface: ${theme.surfaceColor};
        --text: ${theme.textColor};
        --muted: ${theme.mutedTextColor};
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 20%, white) 0%, transparent 38%),
          linear-gradient(180deg, #ffffff 0%, var(--surface) 100%);
      }
      .page {
        max-width: 980px;
        margin: 0 auto;
        padding: 28px 20px 56px;
      }
      .hero {
        border-radius: 18px;
        padding: 24px;
        background: linear-gradient(140deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 72%, #022c22) 100%);
        color: #fff;
      }
      .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.85; }
      .title { margin: 10px 0 8px; font-size: 34px; line-height: 1.1; }
      .subtitle { margin: 0; max-width: 68ch; opacity: 0.94; }
      .grid { margin-top: 16px; display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #fff;
        padding: 14px;
      }
      .label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
      .value { margin-top: 7px; font-size: 18px; font-weight: 700; }
      .section { margin-top: 18px; }
      .section h2 { margin: 0 0 8px; font-size: 18px; }
      .section p { margin: 0; color: var(--muted); line-height: 1.5; }
      .chip-wrap { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
      .chip {
        border: 1px solid color-mix(in srgb, var(--primary) 20%, #e2e8f0);
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 12px;
        background: color-mix(in srgb, var(--primary) 9%, white);
      }
      .muted { color: var(--muted); font-size: 13px; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        overflow: hidden;
        border-radius: 12px;
      }
      th, td {
        text-align: left;
        padding: 10px;
        font-size: 13px;
      }
      th {
        background: color-mix(in srgb, var(--primary) 7%, white);
        color: var(--text);
        border-bottom: 1px solid #dbeafe;
      }
      td { border-bottom: 1px solid #f1f5f9; }
      .footer {
        margin-top: 24px;
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: var(--muted);
        font-size: 12px;
      }
      @media (max-width: 820px) {
        .grid { grid-template-columns: 1fr; }
        .title { font-size: 28px; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <p class="eyebrow">${escapeHtml(theme.brandName)} Delivery Brief</p>
        <h1 class="title">${escapeHtml(projectName)}</h1>
        <p class="subtitle">Prepared for ${escapeHtml(customer)}. This brief summarizes objectives, execution model, timeline, and a delivery-ready task snapshot.</p>
      </section>

      <section class="grid">
        ${includeExecutionHealth
          ? `<article class="card"><p class="label">Progress</p><p class="value">${progress}%</p></article>
        <article class="card"><p class="label">Risk</p><p class="value">${escapeHtml(risk)}</p></article>
        <article class="card"><p class="label">Budget</p><p class="value">${formatNumber(input.project.budget_amount)} NOK</p></article>`
          : `<article class="card"><p class="label">Budget</p><p class="value">${formatNumber(input.project.budget_amount)} NOK</p></article>
        <article class="card"><p class="label">Estimated Hours</p><p class="value">${formatNumber(input.project.estimated_hours)}h</p></article>
        <article class="card"><p class="label">Planned End</p><p class="value">${escapeHtml(formatDate(input.project.end_date))}</p></article>`}
      </section>

      <section class="section card">
        <h2>Project Story</h2>
        <p>${escapeHtml(description)}</p>
      </section>

      <section class="section card">
        <h2>Delivery Snapshot</h2>
        <p><strong>Manager:</strong> ${escapeHtml(managerName)}<br /><strong>Start:</strong> ${escapeHtml(formatDate(input.project.start_date))}<br /><strong>End:</strong> ${escapeHtml(formatDate(input.project.end_date))}<br /><strong>Estimated hours:</strong> ${formatNumber(input.project.estimated_hours)}h</p>
      </section>

      <section class="section card">
        <h2>Team</h2>
        <div class="chip-wrap">${teamChips}</div>
      </section>

      <section class="section card">
        <h2>Estimate Modules</h2>
        ${estimateModules.length > 0
          ? `<table><thead><tr><th>Module</th><th>Estimated Hours</th></tr></thead><tbody>${estimateModuleRows}</tbody></table>`
          : '<p class="muted">Estimate modules are not configured yet.</p>'}
      </section>

      <footer class="footer">
        <span>Generated: ${escapeHtml(generatedAt.toLocaleString('en-GB'))}</span>
        <span>Prepared by ${escapeHtml(theme.brandName)}</span>
      </footer>
    </main>
  </body>
</html>`
}

export function downloadClientBriefHtml(input: BuildClientBriefInput) {
  const html = buildClientBriefHtml(input)
  const safeName = normalizeFileSafe(input.project.name || 'project')
  const fileName = `${safeName}-client-brief.html`
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  downloadBlob(fileName, blob)
  return fileName
}

function downloadBlob(fileName: string, blob: Blob) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export async function downloadClientBriefPdf(input: BuildClientBriefInput) {
  const { jsPDF } = await import('jspdf')
  const theme = input.theme ?? DEFAULT_THEME
  const generatedAt = input.generatedAt ?? new Date()
  const projectName = input.project.name || 'Project'
  const customer = input.project.customer_name ?? 'Confidential'
  const managerName = input.projectManagerName ?? 'Not assigned'
  const progress = deriveProgress(input.project)
  const risk = deriveRisk(input.project)
  const includeExecutionHealth = hasProjectExecutionSignals(input.project, input.tasks)
  const estimateModules = getEstimateModules(input)
  const description = input.project.description ?? 'This proposal outlines the project scope, delivery milestones, and execution approach.'

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

  pdf.setFillColor(15, 118, 110)
  pdf.rect(0, 0, pageWidth, 122, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`${theme.brandName} Delivery Brief`, margin, 36)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(24)
  pdf.text(truncateLine(projectName, 70), margin, 62)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.text(truncateLine(`Prepared for ${customer}`, 90), margin, 84)

  cursorY = 148
  pdf.setTextColor(15, 23, 42)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('Project Snapshot', margin, cursorY)

  cursorY += 16
  pdf.setDrawColor(226, 232, 240)
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(margin, cursorY, contentWidth, 68, 8, 8, 'FD')

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(71, 85, 105)
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
  pdf.setTextColor(15, 23, 42)
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
  pdf.text('Project Story', margin, cursorY)
  cursorY += 16

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(71, 85, 105)
  const descriptionLines = pdf.splitTextToSize(description, contentWidth)
  pdf.text(descriptionLines, margin, cursorY)
  cursorY += descriptionLines.length * 14 + 10

  ensureSpace(84)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(15, 23, 42)
  pdf.text('Delivery Details', margin, cursorY)
  cursorY += 16

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(71, 85, 105)
  pdf.text(`Manager: ${managerName}`, margin, cursorY)
  cursorY += 14
  pdf.text(`Start: ${formatDate(input.project.start_date)}   End: ${formatDate(input.project.end_date)}`, margin, cursorY)
  cursorY += 14
  pdf.text(`Budget: ${formatNumber(input.project.budget_amount)} NOK`, margin, cursorY)
  cursorY += 20

  ensureSpace(80)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(15, 23, 42)
  pdf.text('Team', margin, cursorY)
  cursorY += 16

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(71, 85, 105)
  const teamLine = input.teamMemberNames.length
    ? input.teamMemberNames.join(', ')
    : 'Team will be assigned after approval.'
  const teamLines = pdf.splitTextToSize(teamLine, contentWidth)
  pdf.text(teamLines, margin, cursorY)
  cursorY += teamLines.length * 14 + 14

  ensureSpace(120)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(15, 23, 42)
  pdf.text('Estimate Modules', margin, cursorY)
  cursorY += 14

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(71, 85, 105)
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
  pdf.setTextColor(100, 116, 139)
  pdf.text(footer, margin, pageHeight - 24)

  const safeName = normalizeFileSafe(projectName || 'project')
  const fileName = `${safeName}-client-brief.pdf`
  pdf.save(fileName)
  return fileName
}

export async function downloadClientBriefDocx(input: BuildClientBriefInput) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')

  const theme = input.theme ?? DEFAULT_THEME
  const generatedAt = input.generatedAt ?? new Date()
  const projectName = input.project.name || 'Project'
  const customer = input.project.customer_name ?? 'Confidential'
  const managerName = input.projectManagerName ?? 'Not assigned'
  const progress = deriveProgress(input.project)
  const risk = deriveRisk(input.project)
  const includeExecutionHealth = hasProjectExecutionSignals(input.project, input.tasks)
  const estimateModules = getEstimateModules(input)
  const description = input.project.description ?? 'This proposal outlines the project scope, delivery milestones, and execution approach.'

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
            children: [new TextRun({ text: `${projectName} - Client Brief`, bold: true, color: '0F766E' })],
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
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'Project Story' }),
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

export async function downloadClientBrief(
  input: BuildClientBriefInput,
  format: ClientBriefExportFormat,
) {
  let estimateModules: BuildClientBriefInput['estimateModules']

  try {
    const modules = await getProjectTaskWorkPackages(input.project.id)
    estimateModules = modules.map((item) => ({
      name: item.name,
      estimated_hours: item.estimated_hours,
    }))
  } catch {
    estimateModules = []
  }

  const exportInput: BuildClientBriefInput = {
    ...input,
    estimateModules,
  }

  if (format === 'html') {
    return downloadClientBriefHtml(exportInput)
  }

  if (format === 'pdf') {
    return downloadClientBriefPdf(exportInput)
  }

  return downloadClientBriefDocx(exportInput)
}
