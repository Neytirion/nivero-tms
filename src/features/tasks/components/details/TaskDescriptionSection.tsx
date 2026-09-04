import type { ParsedAttachment } from '../../utils/client-intake.utils'

interface TaskDescriptionSectionProps {
  isTaskEditing: boolean
  isTaskSaving: boolean
  canEditDescription: boolean
  descriptionDraft: string
  setDescriptionDraft: (value: string) => void
  descriptionText: string
  attachments: ParsedAttachment[]
  onPreviewAttachment: (attachment: ParsedAttachment) => void
}

const TASK_DESCRIPTION_MAX_LENGTH = 250

export function TaskDescriptionSection({
  isTaskEditing,
  isTaskSaving,
  canEditDescription,
  descriptionDraft,
  setDescriptionDraft,
  descriptionText,
  attachments,
  onPreviewAttachment,
}: TaskDescriptionSectionProps) {
  const imageAttachments = attachments.filter((attachment) => attachment.isImage)
  const fileAttachments = attachments.filter((attachment) => !attachment.isImage)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Context</p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">Description</h2>
        </div>
        {isTaskEditing && isTaskSaving ? <span className="text-xs text-slate-500">Saving...</span> : null}
      </div>

      {isTaskEditing && canEditDescription ? (
        <div>
          <textarea
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            placeholder="Add description..."
            maxLength={TASK_DESCRIPTION_MAX_LENGTH}
            rows={5}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-6 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200"
          />
          <p className="mt-1 text-right text-xs text-slate-500">
            {descriptionDraft.length}/{TASK_DESCRIPTION_MAX_LENGTH}
          </p>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {descriptionText || 'No description'}
        </p>
      )}

      {!isTaskEditing && attachments.length > 0 ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Attachments</h3>
            <span className="text-xs text-slate-500">{attachments.length}</span>
          </div>
          <div className="space-y-3">
            {imageAttachments.map((attachment, index) => (
              <button
                key={attachment.url}
                type="button"
                onClick={() => onPreviewAttachment(attachment)}
                className="block max-w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left transition hover:border-sky-300"
              >
                <img
                  src={attachment.url}
                  alt={`Attachment preview: ${attachment.name || `Image ${index + 1}`}`}
                  className="block h-auto max-h-80 max-w-[520px] object-left-top"
                  loading="lazy"
                />
                <span className="block border-t border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                  {attachment.name || `Image ${index + 1}`}
                </span>
              </button>
            ))}

            {fileAttachments.map((attachment, index) => (
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
    </section>
  )
}
