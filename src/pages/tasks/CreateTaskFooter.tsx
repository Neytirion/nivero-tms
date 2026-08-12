import type { CreateTaskFooterProps } from './create-task-section.types'

export function CreateTaskFooter(props: CreateTaskFooterProps) {
  return (
    <button
      type="button"
      onClick={props.onCreateTask}
      disabled={props.isCreationBlocked}
      className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {props.isLoading ? 'Creating...' : 'Create task'}
    </button>
  )
}