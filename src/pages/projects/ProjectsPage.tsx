import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ProjectsSummaryCards, ProjectsTable } from '../../features/projects/components'
import { deriveRisk } from '../../features/projects/utils/project-metrics'
import { useProjectsPageController } from '../../features/projects/hooks/useProjectsPageController'

type ProjectSummaryFilter = 'all' | 'active' | 'completed' | 'risks'

function parseSummaryFilter(value: string | null): ProjectSummaryFilter {
  return value === 'active' || value === 'completed' || value === 'risks' ? value : 'all'
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const summaryFilter = parseSummaryFilter(searchParams.get('filter'))

  const {
    isLoading,
    projects,
    selectedProjectId,
    totalProjects,
    activeProjects,
    completedProjects,
    riskProjects,
    searchValue,
    selectedCustomer,
    setSearchValue,
    setSelectedCustomer,
    applySearch,
    resetFilters,
    filteredProjects,
  } = useProjectsPageController({
    initialSearchValue: searchParams.get('q') ?? '',
    initialSelectedCustomer: searchParams.get('customer'),
  })

  const visibleProjects = useMemo(() => {
    if (summaryFilter === 'all') {
      return filteredProjects
    }

    if (summaryFilter === 'active') {
      return filteredProjects.filter((project) => (project.status ?? '').toLowerCase() !== 'completed')
    }

    if (summaryFilter === 'completed') {
      return filteredProjects.filter((project) => (project.status ?? '').toLowerCase() === 'completed')
    }

    return filteredProjects.filter((project) => deriveRisk(project) === 'Red')
  }, [filteredProjects, summaryFilter])

  const handleSummaryFilterChange = (filter: ProjectSummaryFilter) => {
    const nextFilter = summaryFilter === filter ? 'all' : filter
    const nextParams = new URLSearchParams(searchParams)
    if (nextFilter === 'all') {
      nextParams.delete('filter')
    } else {
      nextParams.set('filter', nextFilter)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const handleSearchSubmit = () => {
    applySearch()
    const nextParams = new URLSearchParams(searchParams)
    if (searchValue.trim()) {
      nextParams.set('q', searchValue.trim())
    } else {
      nextParams.delete('q')
    }
    setSearchParams(nextParams, { replace: true })
  }

  const handleCustomerChange = (customer: string | null) => {
    setSelectedCustomer(customer)
    const nextParams = new URLSearchParams(searchParams)
    if (customer) {
      nextParams.set('customer', customer)
    } else {
      nextParams.delete('customer')
    }
    setSearchParams(nextParams, { replace: true })
  }

  // Reset filters when refresh signal is detected
  useEffect(() => {
    if (searchParams.has('refresh')) {
      resetFilters()
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, resetFilters, setSearchParams])

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(2,132,199,0.03))]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Project Portfolio</h2>
            <p className="mt-2 text-sm text-slate-600">Create, filter, and drill down into project health, tasks, estimates, and team access.</p>
          </div>
        </div>
      </section>

      <ProjectsSummaryCards
        totalProjects={totalProjects}
        activeProjects={activeProjects}
        completedProjects={completedProjects}
        riskProjects={riskProjects}
        activeFilter={summaryFilter}
        onFilterChange={handleSummaryFilterChange}
      />

      <ProjectsTable
        searchValue={searchValue}
        selectedCustomer={selectedCustomer}
        onSearchChange={setSearchValue}
        onSelectCustomer={handleCustomerChange}
        onSearchSubmit={handleSearchSubmit}
        isLoading={isLoading}
        onOpenCreateProject={() => navigate('/app/projects/create')}
        allProjects={projects}
        projects={visibleProjects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(projectId) => {
          const query = searchParams.toString()
          navigate(`/app/projects/${projectId}`, {
            state: { backTo: `/app/projects${query ? `?${query}` : ''}` },
          })
        }}
      />
    </div>
  )
}
