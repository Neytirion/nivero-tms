import { useEffect, useState } from 'react'
import {
  getProjectDocuments,
  uploadProjectDocument,
  type ProjectDocumentPreview,
} from '../../../../lib/pm'

interface ProjectDocumentsTabProps {
  projectId: string
  canEdit: boolean
}

function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes || sizeBytes <= 0) {
    return '-'
  }

  const kb = sizeBytes / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }

  return `${(kb / 1024).toFixed(1)} MB`
}

export function ProjectDocumentsTab({ projectId, canEdit }: ProjectDocumentsTabProps) {
  const [documents, setDocuments] = useState<ProjectDocumentPreview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')

  const loadDocuments = async () => {
    setIsLoading(true)

    try {
      const data = await getProjectDocuments(projectId)
      setDocuments(data)
      setStatus(`Loaded ${data.length} document(s)`)
    } catch (error) {
      setStatus(error instanceof Error ? `Load documents error: ${error.message}` : 'Load documents error')
    }

    setIsLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocuments()
    // reload on project switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const uploadDocument = async (file: File | null) => {
    if (!file || !canEdit) {
      return
    }

    setIsLoading(true)

    try {
      await uploadProjectDocument({
        projectId,
        file,
      })
      await loadDocuments()
      setStatus(`Uploaded: ${file.name}`)
    } catch (error) {
      setStatus(error instanceof Error ? `Upload error: ${error.message}` : 'Upload error')
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Documents</h4>
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
          Upload
          <input
            type="file"
            disabled={!canEdit || isLoading}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              void uploadDocument(file)
              event.target.value = ''
            }}
            className="hidden"
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-slate-500">{status}</p>

      <div className="mt-3 space-y-2">
        {documents.length === 0 ? <p className="text-sm text-slate-500">No documents yet</p> : null}

        {documents.map((item) => (
          <a
            key={item.id}
            href={item.file_url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-cyan-300"
          >
            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {item.mime_type ?? 'file'} · {formatFileSize(item.size_bytes)} · {new Date(item.created_at).toLocaleString()}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}
