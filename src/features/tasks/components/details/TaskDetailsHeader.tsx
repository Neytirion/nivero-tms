import type { ParsedAttachment, ParsedClientIntakePayload } from '../../utils/client-intake.utils'

const TASK_TITLE_MAX_LENGTH = 120
const TASK_DESCRIPTION_MAX_LENGTH = 250

interface TaskDetailsHeaderProps {
  taskTitle: string
  isTaskEditing: boolean
  isTaskSaving: boolean
  canEditTask: boolean
  canTakeCurrentTask: boolean
  isLoading: boolean
  titleDraft: string
  setTitleDraft: (v: string) => void
  descriptionDraft: string
  setDescriptionDraft: (v: string) => void
  descriptionText: string
  canEditDescription: boolean
  attachments: ParsedAttachment[]
  clientIntakePayload: ParsedClientIntakePayload | null
  onStartEditing: () => void
  onSaveEdits: () => Promise<void>
  onCancelEditing: () => void
  onTakeTask: () => Promise<void>
  onPreviewAttachment: (a: ParsedAttachment) => void
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
  descriptionDraft,
  setDescriptionDraft,
  descriptionText,
  canEditDescription,
  attachments,
  clientIntakePayload,
  onStartEditing,
  onSaveEdits,
  onCancelEditing,
  onTakeTask,
  onPreviewAttachment,
}: TaskDetailsHeaderProps) {
  const descriptionImageAttachments = attachments.filter((a) => a.isImage)
  const descriptionFileAttachments = attachments.filter((a) => !a.isImage)

  return (
    <header className="mb-8 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
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

      {/* Description */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</label>
        </div>

        {isTaskEditing && canEditDescription ? (
          <div>
            <textarea
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              placeholder="Add description..."
              maxLength={TASK_DESCRIPTION_MAX_LENGTH}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-6 text-slate-900 outline-none shadow-sm transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200"
              rows={5}
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {descriptionDraft.length}/{TASK_DESCRIPTION_MAX_LENGTH}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-base leading-6 text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg border border-slate-200 p-4">
              {descriptionText || 'No description'}
            </p>

            {!clientIntakePayload && attachments.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Attachments ({attachments.length})
                </p>
                <div className="space-y-3">
                  {descriptionImageAttachments.map((attachment, index) => (
                    <button
                      key={attachment.url}
                      type="button"
                      onClick={() => onPreviewAttachment(attachment)}
                      className="inline-block max-w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-sky-300"
                    >
                      <img
                        src={attachment.url}
                        alt={`Attachment preview: ${attachment.name || `Image ${index + 1}`}`}
                        className="block h-auto max-h-80 max-w-[520px] object-left-top"
                        loading="lazy"
                      />
                      <div className="border-t border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                        {attachment.name || `Image ${index + 1}`}
                      </div>
                    </button>
                  ))}

                  {descriptionFileAttachments.map((attachment, index) => (
                    <a
                      key={attachment.url}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      <span className="truncate pr-3 font-medium">{attachment.name || `Attachment ${index + 1}`}</span>
                      <span className="shrink-0 text-xs font-semibold text-sky-700">Open</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  )
}
