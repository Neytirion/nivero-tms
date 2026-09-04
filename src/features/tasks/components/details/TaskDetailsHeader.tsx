const TASK_TITLE_MAX_LENGTH = 120

interface TaskDetailsHeaderProps {
  taskTitle: string
  isTaskEditing: boolean
  isTaskSaving: boolean
  canEditTask: boolean
  canTakeCurrentTask: boolean
  isLoading: boolean
  titleDraft: string
  setTitleDraft: (v: string) => void
  onStartEditing: () => void
  onSaveEdits: () => Promise<void>
  onCancelEditing: () => void
  onTakeTask: () => Promise<void>
}

export function TaskDetailsHeader({
  taskTitle,
  isTaskEditing,
  isTaskSaving,
  canEditTask,
  canTakeCurrentTask,
  isLoading,
  titleDraft,
  setTitleDraft,
  onStartEditing,
  onSaveEdits,
  onCancelEditing,
  onTakeTask,
}: TaskDetailsHeaderProps) {
  return (
    <header className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Task details</p>
          {isTaskEditing ? (
            <div className="mt-2 max-w-2xl">
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                maxLength={TASK_TITLE_MAX_LENGTH}
                placeholder="Task title"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-2xl font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
              <p className="text-right text-xs text-slate-500">
                {titleDraft.length}/{TASK_TITLE_MAX_LENGTH}
              </p>
            </div>
          ) : (
            <div className="mt-1 flex items-start justify-between gap-3">
              <h1 className="text-3xl font-bold text-slate-900 break-words">{taskTitle}</h1>
              {canEditTask ? (
                <button
                  type="button"
                  onClick={onStartEditing}
                  className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Edit
                </button>
              ) : null}
            </div>
          )}
        </div>

        {canTakeCurrentTask ? (
          <button
            type="button"
            onClick={() => void onTakeTask()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-cyan-100 px-3.5 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Take task
          </button>
        ) : null}
      </div>

      {isTaskEditing ? (
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onSaveEdits()}
            disabled={isTaskSaving}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTaskSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancelEditing}
            disabled={isTaskSaving}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : null}

    </header>
  )
}
