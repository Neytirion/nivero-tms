import { useMemo, useState } from 'react'
import type { DetailsTab } from '../../features/projects/components'
import type { ProjectPreview } from '../../lib/pm'

export interface UseProjectsPageFiltersReturn {
  searchValue: string
  activeTab: DetailsTab
  setSearchValue: (value: string) => void
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
  const [activeTab, setActiveTab] = useState<DetailsTab>('overview')

  const filteredProjects = useMemo(() => {
    const query = appliedSearchValue.trim().toLowerCase()

    if (!query) {
      return projects
    }

    return projects.filter((project) => {
      const source = [project.name, project.customer_name, project.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return source.includes(query)
    })
  }, [projects, appliedSearchValue])

  const applySearch = () => {
    setAppliedSearchValue(searchValue)
  }

  return {
    searchValue,
    activeTab,
    setSearchValue,
    applySearch,
    setActiveTab,
    filteredProjects,
  }
}
