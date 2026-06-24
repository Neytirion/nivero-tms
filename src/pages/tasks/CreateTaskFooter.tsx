import type { CreateTaskFooterProps } from './create-task-section.types'

export function CreateTaskFooter(props: CreateTaskFooterProps) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      {props.missingRequiredFields.length > 0 ? null : (
        <p className="text-xs text-slate-500">
          {props.selectedProject ? `Selected project: ${props.selectedProject.name}` : 'Select a project first.'}
        </p>
      )}
      <button
        type="button"
        onClick={props.onCreateTask}
        disabled={
          !props.selectedProjectId ||
          props.hasEstimateVersion !== true ||
          !props.canSubmit ||
          props.missingRequiredFields.length > 0 ||
          props.isLoading
        }
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Create task
      </button>
    </div>
  )
}