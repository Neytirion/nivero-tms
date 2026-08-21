import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { submitClientIntake } from '../../lib/pm/client-intake'

const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024

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

  const titleIsValid = title.trim().length >= 3
  const messageIsValid = message.trim().length >= 10
  const canSubmit = Boolean(token) && titleIsValid && messageIsValid && !isSubmitting

  const attachmentError = useMemo(() => {
    if (attachments.length > MAX_ATTACHMENTS) {
      return `You can upload up to ${MAX_ATTACHMENTS} images.`
    }

    const oversized = attachments.find((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES)
    if (oversized) {
      return `File "${oversized.name}" exceeds 5MB.`
    }

    return ''
  }, [attachments])

  const handleAttachmentsChange = (files: FileList | null) => {
    if (!files) {
      setAttachments([])
      return
    }

    const nextFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    setAttachments(nextFiles)
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
        clientName: clientName.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        title: title.trim(),
        message: message.trim(),
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Your Email (optional)</span>
            <input
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              placeholder="jane@company.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Task Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Fix checkout button overlap on mobile"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Details</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe what should be changed, expected result, and any context."
              rows={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Images (optional)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => handleAttachmentsChange(event.target.files)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
            {attachments.length > 0 ? (
              <p className="mt-1 text-xs text-slate-500">Attached: {attachments.map((file) => file.name).join(', ')}</p>
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
