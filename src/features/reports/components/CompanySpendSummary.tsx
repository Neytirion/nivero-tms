import { Banknote, Building2 } from 'lucide-react'
import type { CompanySpendSummary as CompanySpendSummaryData } from '../types/reports'
import { hoursToDisplay } from '../utils/reports.utils'

interface CompanySpendSummaryProps {
  summaries: CompanySpendSummaryData[]
}

const currencyFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  maximumFractionDigits: 2,
})

export function CompanySpendSummary({ summaries }: CompanySpendSummaryProps) {
  if (summaries.length === 0) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Spend by company</h3>
          <p className="mt-1 text-xs text-slate-600">Actual logged time multiplied by each project&apos;s approved hourly rate.</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Banknote className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="pb-2">Company</th>
              <th className="pb-2">Projects</th>
              <th className="pb-2">Logged time</th>
              <th className="pb-2 text-right">Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summaries.map((summary) => (
              <tr key={summary.companyName}>
                <td className="py-3 text-sm font-semibold text-slate-900">
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-cyan-600" aria-hidden="true" />
                    {summary.companyName}
                  </span>
                </td>
                <td className="py-3 text-sm text-slate-600">{summary.projectCount}</td>
                <td className="py-3 text-sm text-slate-600">{hoursToDisplay(summary.totalMinutes / 60)}</td>
                <td className="py-3 text-right text-sm font-semibold text-slate-900">
                  {summary.spend == null ? 'Rate unavailable' : currencyFormatter.format(summary.spend)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}