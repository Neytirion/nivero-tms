import type { ProjectPreview, TaskPreview } from '../../../lib/pm'
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
  teamMemberNames: string[]
  projectManagerName?: string
  generatedAt?: Date
  theme?: ClientBriefTheme
}

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

function getPriorityTasks(tasks: TaskPreview[]) {
  return [...tasks]
    .sort((left, right) => {
      const leftDue = left.due_date ?? '9999-12-31'
      const rightDue = right.due_date ?? '9999-12-31'

      if (leftDue !== rightDue) {
        return leftDue.localeCompare(rightDue)
      }

      const leftPriority = (left.priority ?? '').toLowerCase()
      const rightPriority = (right.priority ?? '').toLowerCase()
      if (leftPriority !== rightPriority) {
        return leftPriority.localeCompare(rightPriority)
      }

      return left.title.localeCompare(right.title)
    })
    .slice(0, 8)
}

export function buildClientBriefHtml(input: BuildClientBriefInput) {
  const theme = input.theme ?? DEFAULT_THEME
  const generatedAt = input.generatedAt ?? new Date()
  const projectName = input.project.name || 'Project'
  const progress = deriveProgress(input.project)
  const risk = deriveRisk(input.project)
  const topTasks = getPriorityTasks(input.tasks)
  const customer = input.project.customer_name ?? 'Confidential'
  const managerName = input.projectManagerName ?? 'Not assigned'
  const description = input.project.description ?? 'This proposal outlines the project scope, delivery milestones, and execution approach.'

  const topTaskRows = topTasks
    .map((task) => {
      const title = escapeHtml(task.title)
      const status = escapeHtml(task.status ?? 'todo')
      const dueDate = escapeHtml(formatDate(task.due_date))
      const estimate = formatNumber(task.estimate_hours)
      return `<tr><td>${title}</td><td>${status}</td><td>${dueDate}</td><td>${estimate}h</td></tr>`
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
        <article class="card"><p class="label">Progress</p><p class="value">${progress}%</p></article>
        <article class="card"><p class="label">Risk</p><p class="value">${escapeHtml(risk)}</p></article>
        <article class="card"><p class="label">Budget</p><p class="value">${formatNumber(input.project.budget_amount)} NOK</p></article>
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
        <h2>Priority Tasks</h2>
        ${topTasks.length > 0
          ? `<table><thead><tr><th>Task</th><th>Status</th><th>Due</th><th>Estimate</th></tr></thead><tbody>${topTaskRows}</tbody></table>`
          : '<p class="muted">No tasks have been scheduled yet.</p>'}
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
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.click()
  URL.revokeObjectURL(objectUrl)
  return fileName
}
