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
  primaryColor: '#e0f2da',
  accentColor: '#7db991',
  surfaceColor: '#f5f8f2',
  textColor: '#1f2937',
  mutedTextColor: '#55606f',
}

function hexToRgb(hex: string) {
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

function softenRgb(rgb: { r: number; g: number; b: number }, intensity: number) {
  const factor = Math.max(0, Math.min(1, intensity))
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * factor),
    g: Math.round(rgb.g + (255 - rgb.g) * factor),
    b: Math.round(rgb.b + (255 - rgb.b) * factor),
  }
}

function darkenRgb(rgb: { r: number; g: number; b: number }, intensity: number) {
  const factor = Math.max(0, Math.min(1, intensity))
  return {
    r: Math.round(rgb.r * (1 - factor)),
    g: Math.round(rgb.g * (1 - factor)),
    b: Math.round(rgb.b * (1 - factor)),
  }
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
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
      :root {
        --primary: ${theme.primaryColor};
        --accent: ${theme.accentColor};
        --surface: ${theme.surfaceColor};
        --text: ${theme.textColor};
        --muted: ${theme.mutedTextColor};
        --brand-ink: color-mix(in srgb, var(--primary) 18%, #173126);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Manrope", "Avenir Next", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--accent) 24%, white) 0%, transparent 42%),
          radial-gradient(circle at 0% 78%, color-mix(in srgb, var(--primary) 12%, white) 0%, transparent 46%),
          linear-gradient(180deg, #ffffff 0%, var(--surface) 100%);
      }
      .page {
        max-width: 980px;
        margin: 0 auto;
        padding: 30px 20px 56px;
      }
      .hero {
        border-radius: 24px;
        padding: 28px;
        background:
          linear-gradient(140deg, #173126 0%, #234236 100%);
        color: #fff;
        box-shadow: 0 18px 40px rgba(15, 76, 77, 0.22);
      }
      .brand-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .brand-mark {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(255, 255, 255, 0.65);
        border-radius: 999px;
        padding: 5px 11px;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
      }
      .brand-glyph {
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 15px solid color-mix(in srgb, var(--accent) 70%, #8ecf9e);
      }
      .brand-word {
        color: #173126;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.02em;
        text-transform: lowercase;
      }
      .eyebrow { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.86; font-weight: 700; }
      .title { margin: 10px 0 8px; font-size: 36px; line-height: 1.1; font-weight: 800; max-width: 16ch; }
      .subtitle { margin: 0; max-width: 68ch; opacity: 0.94; }
      .grid { margin-top: 16px; display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .card {
        border: 1px solid color-mix(in srgb, var(--primary) 16%, #d8dee5);
        border-radius: 16px;
        background: color-mix(in srgb, white 88%, var(--surface));
        padding: 14px 15px;
      }
      .label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
      .value { margin-top: 7px; font-size: 18px; font-weight: 800; color: var(--brand-ink); }
      .section { margin-top: 18px; }
      .section h2 { margin: 0 0 8px; font-size: 18px; }
      .section p { margin: 0; color: var(--muted); line-height: 1.5; }
      .chip-wrap { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
      .chip {
        border: 1px solid color-mix(in srgb, var(--primary) 28%, #d9e0e0);
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 12px;
        background: color-mix(in srgb, var(--primary) 12%, white);
        color: color-mix(in srgb, var(--primary) 86%, #122);
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
        background: color-mix(in srgb, var(--primary) 10%, white);
        color: var(--text);
        border-bottom: 1px solid color-mix(in srgb, var(--primary) 20%, #dce6e6);
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
        <div class="brand-row">
          <span class="brand-mark" aria-label="${escapeHtml(theme.brandName)} mark">
            <span class="brand-glyph"></span>
            <span class="brand-word">${escapeHtml(theme.brandName.toLowerCase())}</span>
          </span>
          <p class="eyebrow">${escapeHtml(theme.brandName)} Delivery Brief</p>
        </div>
        <h1 class="title">${escapeHtml(projectName)}</h1>
        <p class="subtitle">Prepared for ${escapeHtml(customer)}. This brief summarizes goals, estimate modules, delivery scope, and project execution setup.</p>
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
        <h2>Description</h2>
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
  const primaryRgb = hexToRgb(theme.primaryColor)
  const accentRgb = hexToRgb(theme.accentColor)
  const softAccentRgb = softenRgb(accentRgb, 0.6)
  const brandInkRgb = darkenRgb(primaryRgb, 0.82)
  const headerTextRgb = darkenRgb(accentRgb, 0.56)
  const textRgb = hexToRgb(theme.textColor)
  const mutedRgb = hexToRgb(theme.mutedTextColor)
  const generatedAt = input.generatedAt ?? new Date()
  const projectName = input.project.name || 'Project'
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

  // Load and add logo if available
  let logoDataUrl: string | null = null
  try {
    const response = await fetch('/nivero-logo.svg')
    if (response.ok) {
      const blob = await response.blob()
      const svgDataUrl = URL.createObjectURL(blob)
      
      // Convert SVG to PNG via canvas with high resolution
      const dpr = 8 // Device pixel ratio for crisp rendering
      const size = 48
      const canvas = document.createElement('canvas')
      canvas.width = size * dpr
      canvas.height = size * dpr
      const ctx = canvas.getContext('2d')
      
      logoDataUrl = await new Promise<string | null>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL('image/png'))
          } else {
            resolve(null)
          }
          URL.revokeObjectURL(svgDataUrl)
        }
        img.onerror = () => {
          resolve(null)
          URL.revokeObjectURL(svgDataUrl)
        }
        img.src = svgDataUrl
      })
    }
  } catch {
    // Logo loading failed, continue without it
  }

  pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  pdf.rect(0, 0, pageWidth, 122, 'F')

  pdf.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
  pdf.rect(0, 0, pageWidth, 10, 'F')

  pdf.setFillColor(softAccentRgb.r, softAccentRgb.g, softAccentRgb.b)
  pdf.circle(pageWidth - 42, -8, 80, 'F')

  // Add logo if loaded successfully
  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, 'PNG', margin, 14, 48, 48)
    } catch {
      // Logo adding failed, continue without it
    }
  }

  pdf.setTextColor(headerTextRgb.r, headerTextRgb.g, headerTextRgb.b)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`${theme.brandName} Delivery Brief`, logoDataUrl ? margin + 60 : margin, 40)
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

export async function downloadClientBriefDocx(input: BuildClientBriefInput) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')

  const theme = input.theme ?? DEFAULT_THEME
  const brandInkRgb = darkenRgb(hexToRgb(theme.primaryColor), 0.82)
  const brandInkHex = [brandInkRgb.r, brandInkRgb.g, brandInkRgb.b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
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
