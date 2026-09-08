import {
  getMyProjects,
  type ProjectPreview,
} from '../../../lib/pm'

type SetProjects = (value: ProjectPreview[] | ((prev: ProjectPreview[]) => ProjectPreview[])) => void

interface ProjectSyncConfig {
  setProjects: SetProjects
}

export function createProjectSyncActions(config: ProjectSyncConfig) {
  const reloadProjectsOnly = async () => {
    const nextProjects = await getMyProjects()
    config.setProjects(nextProjects)
    return nextProjects
  }

  return {
    reloadProjectsOnly,
  }
}
