import { useMemo, useState } from 'react'
import type { DetailsTab } from '../../features/projects/components'
import type { ProjectPreview } from '../../lib/pm'

export interface UseProjectsPageFiltersReturn {
  searchValue: string
  selectedCustomer: string | null
  activeTab: DetailsTab
  setSearchValue: (value: string) => void
  setSelectedCustomer: (value: string | null) => void
  applySearch: () => void
  setActiveTab: (tab: DetailsTab) => void
  filteredProjects: ProjectPreview[]
}

/**
 * Manage project list filters: search query and active tab
 */
export function useProjectsPageFilters(projects: ProjectPreview[]): UseProjectsPageFiltersReturn {
  const [searchValue, setSearchValue] = useState('')
  const [appliedSearchValue, setAppliedSearchValue] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailsTab>('overview')

  const filteredProjects = useMemo(() => {
    const query = appliedSearchValue.trim().toLowerCase()
    const normalizedSelectedCustomer = selectedCustomer?.trim().toLowerCase() ?? ''

    const customerScopedProjects = normalizedSelectedCustomer
      ? projects.filter((project) => (project.customer_name ?? '').trim().toLowerCase() === normalizedSelectedCustomer)
      : projects

    if (!query) {
      return customerScopedProjects
    }

    return customerScopedProjects.filter((project) => {
      const source = [project.name, project.customer_name, project.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return source.includes(query)
    })
  }, [projects, appliedSearchValue, selectedCustomer])

  const applySearch = () => {
    setAppliedSearchValue(searchValue)
  }

  return {
    searchValue,
    selectedCustomer,
    activeTab,
    setSearchValue,
    setSelectedCustomer,
    applySearch,
    setActiveTab,
    filteredProjects,
  }
}
