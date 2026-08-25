import type { ReactNode } from 'react'

type HeaderBadgeTone = 'neutral' | 'cyan'

interface HeaderBadge {
  label: string
  tone?: HeaderBadgeTone
}

interface WorkspacePageHeaderProps {
  eyebrow: string
  title: string
  description?: string
  backButton?: {
    label: string
    onClick: () => void
  }
  actions?: ReactNode
  badges?: HeaderBadge[]
  gradientClassName?: string
}

function badgeClassName(tone: HeaderBadgeTone = 'neutral') {
  if (tone === 'cyan') {
    return 'rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-800'
  }

  return 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700'
}

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  backButton,
  actions,
  badges = [],
  gradientClassName = 'bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(16,185,129,0.06))]',
}: WorkspacePageHeaderProps) {
  return (
    <section className={`page-section ${gradientClassName}`}>
      {backButton || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {backButton ? (
            <button
              type="button"
              onClick={backButton.onClick}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {backButton.label}
            </button>
          ) : (
            <span />
          )}

          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}

      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-900">{title}</h2>

      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}

      {badges.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {badges.map((badge) => (
            <span key={`${badge.label}-${badge.tone ?? 'neutral'}`} className={badgeClassName(badge.tone)}>
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}