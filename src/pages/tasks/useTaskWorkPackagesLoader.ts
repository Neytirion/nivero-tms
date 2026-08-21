import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import {
  getProjectTaskWorkPackages,
  getProjectUseEstimates,
  getProjectWorkPackageDisplayProfileById,
  hasProjectEstimateVersion,
  type WorkPackagePreview,
} from '../../lib/pm'

interface UseTaskWorkPackagesLoaderInput {
  selectedProjectId: string | null
  setTaskWorkPackageId: Dispatch<SetStateAction<string>>
}

export function useTaskWorkPackagesLoader(input: UseTaskWorkPackagesLoaderInput) {
  const { selectedProjectId, setTaskWorkPackageId } = input
  const [workPackages, setWorkPackages] = useState<Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours' | 'color'>>>([])
  const [hasEstimateVersion, setHasEstimateVersion] = useState<boolean | null>(null)
  const [useEstimates, setUseEstimates] = useState<boolean>(false)
  const [isWorkPackagesLoading, setIsWorkPackagesLoading] = useState(false)
  const [workPackageLabelByAnyId, setWorkPackageLabelByAnyId] = useState<Record<string, string>>({})
  const [workPackageColorByAnyId, setWorkPackageColorByAnyId] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadWorkPackages = async () => {
      if (!selectedProjectId) {
        setWorkPackages([])
        setWorkPackageLabelByAnyId({})
        setWorkPackageColorByAnyId({})
        setTaskWorkPackageId('')
        setHasEstimateVersion(null)
        setUseEstimates(false)
        setIsWorkPackagesLoading(false)
        return
      }

      setHasEstimateVersion(null)
      setIsWorkPackagesLoading(true)

      try {
        const [nextWorkPackages, displayByAnyId] = await Promise.all([
          getProjectTaskWorkPackages(selectedProjectId),
          getProjectWorkPackageDisplayProfileById(selectedProjectId),
        ])
        const useEstimatesEnabled = await getProjectUseEstimates(selectedProjectId)
        setUseEstimates(useEstimatesEnabled)

        setWorkPackageLabelByAnyId(
          Object.entries(displayByAnyId).reduce<Record<string, string>>((acc, [id, profile]) => {
            acc[id] = profile.displayName
            return acc
          }, {}),
        )
        setWorkPackageColorByAnyId(
          Object.entries(displayByAnyId).reduce<Record<string, string>>((acc, [id, profile]) => {
            acc[id] = profile.color
            return acc
          }, {}),
        )

        // If project doesn't use estimates, allow task creation (hasEstimateVersion = true)
        // If project uses estimates, check for estimate version
        let canCreateTasks = true
        if (useEstimatesEnabled) {
          canCreateTasks = await hasProjectEstimateVersion(selectedProjectId)
        }

        setWorkPackages(nextWorkPackages)
        setHasEstimateVersion(canCreateTasks)
        setTaskWorkPackageId((prev) =>
          nextWorkPackages.some((item: Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours' | 'color'>) => item.id === prev)
            ? prev
            : '',
        )
      } catch {
        setWorkPackages([])
        setWorkPackageLabelByAnyId({})
        setWorkPackageColorByAnyId({})
        setHasEstimateVersion(true)
        setUseEstimates(false)
        setTaskWorkPackageId('')
      } finally {
        setIsWorkPackagesLoading(false)
      }
    }

    void loadWorkPackages()
  }, [selectedProjectId, setTaskWorkPackageId])

  return {
    workPackages,
    workPackageLabelByAnyId,
    workPackageColorByAnyId,
    hasEstimateVersion,
    useEstimates,
    isWorkPackagesLoading,
  }
}
