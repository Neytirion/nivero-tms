import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { submitClientIntake } from '../../lib/pm/client-intake'

const MAX_ATTACHMENTS = 10
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024
const MIN_TITLE_LENGTH = 3
const MAX_TITLE_LENGTH = 255
const MIN_MESSAGE_LENGTH = 10
const MAX_MESSAGE_LENGTH = 1000
const MAX_CLIENT_NAME_LENGTH = 120
const MAX_CLIENT_EMAIL_LENGTH = 254

function isLikelyEmail(value: string) {
  if (!value.trim()) {
    return true
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function getFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function mergeUniqueFiles(existing: File[], incoming: File[]) {
  const unique = new Map<string, File>()

  for (const file of existing) {
    unique.set(getFileKey(file), file)
  }

  for (const file of incoming) {
    unique.set(getFileKey(file), file)
  }

  return Array.from(unique.values())
}

export function ClientIntakePage() {
  const { token } = useParams<{ token: string }>()
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const clientNameTrimmed = clientName.trim()
  const clientEmailTrimmed = clientEmail.trim()
  const titleTrimmed = title.trim()
  const messageTrimmed = message.trim()

  const clientNameIsValid = clientNameTrimmed.length <= MAX_CLIENT_NAME_LENGTH
  const clientEmailIsValid = clientEmailTrimmed.length <= MAX_CLIENT_EMAIL_LENGTH && isLikelyEmail(clientEmailTrimmed)
  const titleIsValid = titleTrimmed.length >= MIN_TITLE_LENGTH && titleTrimmed.length <= MAX_TITLE_LENGTH
  const messageIsValid = messageTrimmed.length >= MIN_MESSAGE_LENGTH && messageTrimmed.length <= MAX_MESSAGE_LENGTH

  const canSubmit =
    Boolean(token) &&
    clientNameIsValid &&
    clientEmailIsValid &&
    titleIsValid &&
    messageIsValid &&
    !isSubmitting

  const attachmentError = useMemo(() => {
    if (attachments.length > MAX_ATTACHMENTS) {
      return `You can upload up to ${MAX_ATTACHMENTS} files.`
    }

    const oversized = attachments.find((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES)
    if (oversized) {
      return `File "${oversized.name}" exceeds 5MB.`
    }

    return ''
  }, [attachments])

  const handleAttachmentsChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    const nextFiles = Array.from(files)
    setAttachments((prev) => mergeUniqueFiles(prev, nextFiles))
  }

  const removeAttachment = (fileToRemove: File) => {
    const targetKey = getFileKey(fileToRemove)
    setAttachments((prev) => prev.filter((file) => getFileKey(file) !== targetKey))
  }

  const handleSubmit = async () => {
    if (!token || !canSubmit || attachmentError) {
      return
    }

    setIsSubmitting(true)
    setStatus('')

    try {
      const encodedAttachments = await Promise.all(
        attachments.map(async (file) => ({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          contentBase64: await fileToBase64(file),
        })),
      )

      await submitClientIntake({
        token,
        clientName: clientNameTrimmed || undefined,
        clientEmail: clientEmailTrimmed || undefined,
        title: titleTrimmed,
        message: messageTrimmed,
        attachments: encodedAttachments,
      })

      setIsSuccess(true)
      setStatus('Thanks. Your request has been sent to the project team.')
      setTitle('')
      setMessage('')
      setAttachments([])
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not submit your request')
      setIsSuccess(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-xl font-bold text-slate-900">Project Request Form</h1>
        <p className="mt-1 text-sm text-slate-600">
          Send tasks, bug reports, comments, or change requests directly to this project.
        </p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Your Name (optional)</span>
            <input
              type="text"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Jane Doe"
              maxLength={MAX_CLIENT_NAME_LENGTH}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={clientNameIsValid ? 'text-slate-500' : 'text-rose-600'}>
                Max {MAX_CLIENT_NAME_LENGTH} characters
              </span>
              <span className="text-slate-400">{clientName.length}/{MAX_CLIENT_NAME_LENGTH}</span>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Your Email (optional)</span>
            <input
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              placeholder="jane@company.com"
              maxLength={MAX_CLIENT_EMAIL_LENGTH}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={clientEmailIsValid ? 'text-slate-500' : 'text-rose-600'}>
                Optional valid email, max {MAX_CLIENT_EMAIL_LENGTH} characters
              </span>
              <span className="text-slate-400">{clientEmail.length}/{MAX_CLIENT_EMAIL_LENGTH}</span>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Task Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Fix checkout button overlap on mobile"
              maxLength={MAX_TITLE_LENGTH}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={titleIsValid || titleTrimmed.length === 0 ? 'text-slate-500' : 'text-rose-600'}>
                {MIN_TITLE_LENGTH}-{MAX_TITLE_LENGTH} characters
              </span>
              <span className="text-slate-400">{title.length}/{MAX_TITLE_LENGTH}</span>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Details</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe what should be changed, expected result, and any context."
              maxLength={MAX_MESSAGE_LENGTH}
              rows={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={messageIsValid || messageTrimmed.length === 0 ? 'text-slate-500' : 'text-rose-600'}>
                {MIN_MESSAGE_LENGTH}-{MAX_MESSAGE_LENGTH} characters
              </span>
              <span className="text-slate-400">{message.length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Attachments (optional)</span>
            <input
              type="file"
              multiple
              onChange={(event) => {
                handleAttachmentsChange(event.target.files)
                event.currentTarget.value = ''
              }}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
            {attachments.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-slate-500">Attached ({attachments.length}/{MAX_ATTACHMENTS})</p>
                <ul className="space-y-1">
                  {attachments.map((file) => (
                    <li key={getFileKey(file)} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                      <span className="truncate text-xs text-slate-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(file)}
                        className="shrink-0 rounded border border-rose-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        aria-label={`Remove ${file.name}`}
                      >
                        x
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {attachmentError ? <p className="mt-1 text-xs text-rose-600">{attachmentError}</p> : null}
          </label>
        </div>

        {status ? (
          <p className={`mt-4 text-sm ${isSuccess ? 'text-emerald-700' : 'text-rose-700'}`}>{status}</p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || Boolean(attachmentError)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </section>
    </main>
  )
}
