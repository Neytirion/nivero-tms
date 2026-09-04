import type { ParsedAttachment, ParsedClientIntakePayload } from '../../utils/client-intake.utils'

interface TaskClientIntakeSectionProps {
  clientIntakePayload: ParsedClientIntakePayload
  isTaskEditing: boolean
  canEditClientRequest: boolean
  clientNameDraft: string
  setClientNameDraft: (v: string) => void
  clientEmailDraft: string
  setClientEmailDraft: (v: string) => void
  clientRequestDetailsDraft: string
  setClientRequestDetailsDraft: (v: string) => void
  clientRequestAttachments: ParsedAttachment[]
  onPreviewAttachment: (a: ParsedAttachment) => void
  onRemoveAttachment: (url: string) => void
}

export function TaskClientIntakeSection({
  clientIntakePayload,
  isTaskEditing,
  canEditClientRequest,
  clientNameDraft,
  setClientNameDraft,
  clientEmailDraft,
  setClientEmailDraft,
  clientRequestDetailsDraft,
  setClientRequestDetailsDraft,
  clientRequestAttachments,
  onPreviewAttachment,
  onRemoveAttachment,
}: TaskClientIntakeSectionProps) {
  const imageAttachments = clientRequestAttachments.filter((a) => a.isImage)
  const fileAttachments = clientRequestAttachments.filter((a) => !a.isImage)

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Client request</h2>
        <span className="text-xs font-medium text-sky-700">From intake form</span>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 border-b border-sky-100 pb-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">Client name</p>
            {isTaskEditing && canEditClientRequest ? (
              <input
                value={clientNameDraft}
                onChange={(event) => setClientNameDraft(event.target.value)}
                placeholder="Client name"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            ) : (
              <p className="mt-1 text-sm font-medium text-slate-900">{clientIntakePayload.clientName ?? 'Not provided'}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Client email</p>
            {isTaskEditing && canEditClientRequest ? (
              <input
                value={clientEmailDraft}
                onChange={(event) => setClientEmailDraft(event.target.value)}
                placeholder="Client email"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
            ) : (
              <p className="mt-1 break-words text-sm font-medium text-slate-900">{clientIntakePayload.clientEmail ?? 'Not provided'}</p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Request details</p>
          {isTaskEditing && canEditClientRequest ? (
            <textarea
              value={clientRequestDetailsDraft}
              onChange={(event) => setClientRequestDetailsDraft(event.target.value)}
              rows={4}
              placeholder="Client request details"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
              {clientIntakePayload.requestDetails || 'No details provided'}
            </p>
          )}
        </div>

        {clientRequestAttachments.length > 0 ? (
          <div className="border-t border-sky-100 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Attachments</h3>
              <span className="text-xs text-slate-500">{clientRequestAttachments.length}</span>
            </div>
            <div className="space-y-3">
              {imageAttachments.map((attachment, index) => (
                <div
                  key={attachment.url}
                  className="inline-block max-w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => onPreviewAttachment(attachment)}
                    className="block hover:border-sky-300"
                  >
                    <img
                      src={attachment.url}
                      alt={`Attachment preview: ${attachment.name || `Image ${index + 1}`}`}
                      className="block h-auto max-h-80 max-w-[520px] object-left-top"
                      loading="lazy"
                    />
                  </button>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                    <span className="truncate">{attachment.name || `Image ${index + 1}`}</span>
                    {isTaskEditing && canEditClientRequest ? (
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(attachment.url)}
                        className="shrink-0 rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {fileAttachments.map((attachment, index) => (
                <div
                  key={attachment.url}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                >
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate pr-3 font-medium text-slate-700 hover:text-sky-700"
                  >
                    {attachment.name || `Attachment ${index + 1}`}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-xs font-semibold text-sky-700">Open</span>
                    {isTaskEditing && canEditClientRequest ? (
                      <button
                        type="button"
                        onClick={() => onRemoveAttachment(attachment.url)}
                        className="shrink-0 rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
