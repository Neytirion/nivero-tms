import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CreateProjectWithAiModal, ProjectsSummaryCards, ProjectsTable } from '../../features/projects/components'
import { useProjectsPageController } from './useProjectsPageController'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    status,
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
    isCreateModalOpen,
    setIsCreateModalOpen,
    projectName,
    setProjectName,
    projectCustomer,
    setProjectCustomer,
    projectStartDate,
    setProjectStartDate,
    projectEndDate,
    setProjectEndDate,
    canSubmit,
    reset,
    createProjectHandler,
    createProjectFromAiDraftHandler,
    loadDashboardPreview,
  } = useProjectsPageController()

  // Reset filters when refresh signal is detected
  useEffect(() => {
    if (searchParams.has('refresh')) {
      resetFilters()
      // Remove the refresh parameter from URL
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('refresh')
      setSearchParams(newParams, { replace: true })
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
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
      </section>

      <ProjectsSummaryCards
        totalProjects={totalProjects}
        activeProjects={activeProjects}
        completedProjects={completedProjects}
        riskProjects={riskProjects}
      />

      <ProjectsTable
        searchValue={searchValue}
        selectedCustomer={selectedCustomer}
        onSearchChange={setSearchValue}
        onSelectCustomer={setSelectedCustomer}
        onSearchSubmit={applySearch}
        isLoading={isLoading}
        onOpenCreateProject={() => setIsCreateModalOpen(true)}
        onRefresh={() => void loadDashboardPreview()}
        allProjects={projects}
        projects={filteredProjects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(projectId) => navigate(`/app/projects/${projectId}`)}
        onOpenProjectSettings={(projectId: string) => {
          navigate(`/app/projects/${projectId}?tab=settings`)
        }}
      />

      <CreateProjectWithAiModal
        isOpen={isCreateModalOpen}
        projectName={projectName}
        projectCustomer={projectCustomer}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        isLoading={isLoading}
        canSubmit={canSubmit}
        onProjectNameChange={setProjectName}
        onProjectCustomerChange={setProjectCustomer}
        onProjectStartDateChange={setProjectStartDate}
        onProjectEndDateChange={setProjectEndDate}
        onCreate={createProjectHandler}
        onCreateFromAiDraft={createProjectFromAiDraftHandler}
        onClose={() => {
          setIsCreateModalOpen(false)
          reset()
        }}
      />
    </div>
  )
}
