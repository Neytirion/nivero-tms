import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  getProjectTaskWorkPackages,
  getProjectUseEstimates,
  getProjectWorkPackageDisplayProfileById,
  hasProjectEstimateVersion,
  type WorkPackagePreview,
} from '../../../lib/pm'

interface UseTaskWorkPackagesLoaderInput {
  selectedProjectId: string | null
  setTaskWorkPackageId: Dispatch<SetStateAction<string>>
}

type WorkPackageDisplayState = {
  workPackages: Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours' | 'color'>>
  hasEstimateVersion: boolean | null
  useEstimates: boolean
  workPackageLabelByAnyId: Record<string, string>
  workPackageColorByAnyId: Record<string, string>
}

const workPackageDisplayCacheByProjectId = new Map<string, WorkPackageDisplayState>()

export function useTaskWorkPackagesLoader(input: UseTaskWorkPackagesLoaderInput) {
  const { selectedProjectId, setTaskWorkPackageId } = input
  const requestIdRef = useRef(0)
  const [workPackages, setWorkPackages] = useState<Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours' | 'color'>>>([])
  const [hasEstimateVersion, setHasEstimateVersion] = useState<boolean | null>(null)
  const [useEstimates, setUseEstimates] = useState<boolean>(false)
  const [isWorkPackagesLoading, setIsWorkPackagesLoading] = useState(false)
  const [workPackageLabelByAnyId, setWorkPackageLabelByAnyId] = useState<Record<string, string>>({})
  const [workPackageColorByAnyId, setWorkPackageColorByAnyId] = useState<Record<string, string>>({})

  useEffect(() => {
    const activeRequestId = ++requestIdRef.current

    const applyState = (nextState: WorkPackageDisplayState) => {
      setWorkPackages(nextState.workPackages)
      setWorkPackageLabelByAnyId(nextState.workPackageLabelByAnyId)
      setWorkPackageColorByAnyId(nextState.workPackageColorByAnyId)
      setHasEstimateVersion(nextState.hasEstimateVersion)
      setUseEstimates(nextState.useEstimates)
      setTaskWorkPackageId((prev) =>
        nextState.workPackages.some((item) => item.id === prev)
          ? prev
          : '',
      )
    }

    const setIfActive = (fn: () => void) => {
      if (requestIdRef.current !== activeRequestId) {
        return
      }

      fn()
    }

    const loadWorkPackages = async () => {
      if (!selectedProjectId) {
        setIfActive(() => {
          setWorkPackages([])
          setWorkPackageLabelByAnyId({})
          setWorkPackageColorByAnyId({})
          setTaskWorkPackageId('')
          setHasEstimateVersion(null)
          setUseEstimates(false)
          setIsWorkPackagesLoading(false)
        })
        return
      }

      const cached = workPackageDisplayCacheByProjectId.get(selectedProjectId)
      if (cached) {
        setIfActive(() => {
          applyState(cached)
          setIsWorkPackagesLoading(false)
        })
      } else {
        setIfActive(() => {
          setHasEstimateVersion(null)
          setWorkPackages([])
          setWorkPackageLabelByAnyId({})
          setWorkPackageColorByAnyId({})
          setIsWorkPackagesLoading(true)
        })
      }

      try {
        const [nextWorkPackages, displayByAnyId] = await Promise.all([
          getProjectTaskWorkPackages(selectedProjectId),
          getProjectWorkPackageDisplayProfileById(selectedProjectId),
        ])
        const useEstimatesEnabled = await getProjectUseEstimates(selectedProjectId)

        // If project doesn't use estimates, allow task creation (hasEstimateVersion = true)
        // If project uses estimates, check for estimate version
        let canCreateTasks = true
        if (useEstimatesEnabled) {
          canCreateTasks = await hasProjectEstimateVersion(selectedProjectId)
        }

        const nextState: WorkPackageDisplayState = {
          workPackages: nextWorkPackages,
          hasEstimateVersion: canCreateTasks,
          useEstimates: useEstimatesEnabled,
          workPackageLabelByAnyId: Object.entries(displayByAnyId).reduce<Record<string, string>>((acc, [id, profile]) => {
            acc[id] = profile.displayName
            return acc
          }, {}),
          workPackageColorByAnyId: Object.entries(displayByAnyId).reduce<Record<string, string>>((acc, [id, profile]) => {
            acc[id] = profile.color
            return acc
          }, {}),
        }

        workPackageDisplayCacheByProjectId.set(selectedProjectId, nextState)

        setIfActive(() => {
          applyState(nextState)
          setIsWorkPackagesLoading(false)
        })
      } catch {
        setIfActive(() => {
          setWorkPackages([])
          setWorkPackageLabelByAnyId({})
          setWorkPackageColorByAnyId({})
          setHasEstimateVersion(true)
          setUseEstimates(false)
          setTaskWorkPackageId('')
          setIsWorkPackagesLoading(false)
        })
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
