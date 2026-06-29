import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { getProjectTaskWorkPackages, getProjectUseEstimates, hasProjectEstimateVersion, type WorkPackagePreview } from '../../lib/pm'

interface UseTaskWorkPackagesLoaderInput {
  selectedProjectId: string | null
  setTaskWorkPackageId: Dispatch<SetStateAction<string>>
}

export function useTaskWorkPackagesLoader(input: UseTaskWorkPackagesLoaderInput) {
  const { selectedProjectId, setTaskWorkPackageId } = input
  const [workPackages, setWorkPackages] = useState<Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>>>([])
  const [hasEstimateVersion, setHasEstimateVersion] = useState<boolean | null>(null)

  useEffect(() => {
    const loadWorkPackages = async () => {
      if (!selectedProjectId) {
        setWorkPackages([])
        setTaskWorkPackageId('')
        setHasEstimateVersion(null)
        return
      }

      setHasEstimateVersion(null)

      try {
        const nextWorkPackages = await getProjectTaskWorkPackages(selectedProjectId)
        const useEstimates = await getProjectUseEstimates(selectedProjectId)

        // If project doesn't use estimates, allow task creation (hasEstimateVersion = true)
        // If project uses estimates, check for estimate version
        let canCreateTasks = true
        if (useEstimates) {
          canCreateTasks = await hasProjectEstimateVersion(selectedProjectId)
        }

        setWorkPackages(nextWorkPackages)
        setHasEstimateVersion(canCreateTasks)
        setTaskWorkPackageId((prev) =>
          nextWorkPackages.some((item: Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>) => item.id === prev)
            ? prev
            : '',
        )
      } catch {
        setWorkPackages([])
        setHasEstimateVersion(true)
        setTaskWorkPackageId('')
      }
    }

    void loadWorkPackages()
  }, [selectedProjectId, setTaskWorkPackageId])

  return {
    workPackages,
    hasEstimateVersion,
  }
}
