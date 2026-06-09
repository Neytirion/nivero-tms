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
  const summaryItems = [
    { label: 'Total Projects', value: totalProjects, tone: 'text-slate-900 border-slate-200 bg-white' },
    { label: 'Active', value: activeProjects, tone: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
    { label: 'Completed', value: completedProjects, tone: 'text-cyan-800 border-cyan-200 bg-cyan-50' },
    { label: 'Risks', value: riskProjects, tone: 'text-rose-700 border-rose-200 bg-rose-50' },
  ]

  return (
    <section className="page-section bg-slate-50">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <article key={item.label} className={`rounded-lg border px-3 py-2 ${item.tone}`}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
            <p className="mt-1 text-xl font-bold">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
