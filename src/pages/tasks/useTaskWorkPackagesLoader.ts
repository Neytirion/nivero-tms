import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { getProjectTaskWorkPackages, hasProjectEstimateVersion, type WorkPackagePreview } from '../../lib/pm'

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
        const [nextWorkPackages, hasVersion] = await Promise.all([
          getProjectTaskWorkPackages(selectedProjectId),
          hasProjectEstimateVersion(selectedProjectId),
        ])

        setWorkPackages(nextWorkPackages)
        setHasEstimateVersion(hasVersion)
        setTaskWorkPackageId((prev) =>
          nextWorkPackages.some((item: Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>) => item.id === prev)
            ? prev
            : '',
        )
      } catch {
        setWorkPackages([])
        setHasEstimateVersion(false)
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
