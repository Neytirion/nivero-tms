export function TimeTrackingPage() {
  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(6,182,212,0.08),rgba(16,185,129,0.08))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Time Tracking</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Time Tracking v2</h2>
        <p className="mt-2 text-sm text-slate-600">
          This module is being rebuilt from scratch. Legacy functionality has been intentionally removed.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-700">
          Planned next: redesigned logs, cleaner weekly overview, and a simplified manual entry flow.
        </p>
      </section>
    </div>
  )
}
