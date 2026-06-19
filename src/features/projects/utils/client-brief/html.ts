import { buildBriefViewModel } from './view-model'
import type { BuildClientBriefInput } from './types'
import {
  downloadBlob,
  escapeHtml,
  formatDate,
  formatNumber,
  normalizeFileSafe,
} from './formatters'

export function buildClientBriefHtml(input: BuildClientBriefInput) {
  const {
    theme,
    generatedAt,
    projectName,
    progress,
    risk,
    includeExecutionHealth,
    estimateModules,
    customer,
    managerName,
    description,
  } = buildBriefViewModel(input)

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
