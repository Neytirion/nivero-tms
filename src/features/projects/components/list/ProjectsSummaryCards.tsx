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
      <article className="page-section">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total Projects</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{totalProjects}</p>
      </article>
      <article className="page-section">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Active</p>
        <p className="mt-2 text-2xl font-bold text-emerald-700">{activeProjects}</p>
      </article>
      <article className="page-section">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Completed</p>
        <p className="mt-2 text-2xl font-bold text-cyan-800">{completedProjects}</p>
      </article>
      <article className="page-section">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Risks</p>
        <p className="mt-2 text-2xl font-bold text-rose-700">{riskProjects}</p>
      </article>
    </section>
  )
}
