interface ProjectsSummaryCardsProps {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  riskProjects: number
}

export function ProjectsSummaryCards({
  totalProjects,
  activeProjects,
  completedProjects,
  riskProjects,
}: ProjectsSummaryCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="page-section overflow-hidden border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total Projects</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{totalProjects}</p>
          </div>
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            Portfolio
          </span>
        </div>
      </article>
      <article className="page-section overflow-hidden border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Active</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-emerald-700">{activeProjects}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
            In motion
          </span>
        </div>
      </article>
      <article className="page-section overflow-hidden border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-cyan-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-cyan-800">{completedProjects}</p>
          </div>
          <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 shadow-sm">
            Closed
          </span>
        </div>
      </article>
      <article className="page-section overflow-hidden border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Risks</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-rose-700">{riskProjects}</p>
          </div>
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 shadow-sm">
            Watch list
          </span>
        </div>
      </article>
    </section>
  )
}
