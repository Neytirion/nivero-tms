import { useEffect, useState } from 'react'
import {
  deleteProjectDocument,
  getProjectDocuments,
  uploadProjectDocument,
  type ProjectDocumentPreview,
} from '../../../../lib/pm'

interface ProjectDocumentsTabProps {
  projectId: string
  canEdit: boolean
  membersByUserId?: Record<string, string>
  currentUserId?: string | null
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

export function ProjectDocumentsTab({ projectId, canEdit, membersByUserId = {}, currentUserId }: ProjectDocumentsTabProps) {
  const [documents, setDocuments] = useState<ProjectDocumentPreview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadDocuments = async () => {
    setIsLoading(true)

    try {
      const data = await getProjectDocuments(projectId)
      setDocuments(data)
    } catch (error) {
      console.error('Load documents error:', error)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocuments()
    // reload on project switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const deleteDocument = async (doc: ProjectDocumentPreview) => {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    setDeleteError(null)
    try {
      await deleteProjectDocument(doc.id, doc.file_url)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const uploadDocument = async (file: File | null) => {
    if (!file || !canEdit) return
    setIsLoading(true)
    setUploadError(null)
    try {
      await uploadProjectDocument({ projectId, file })
      await loadDocuments()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Documents</h4>
        <label className={`inline-flex cursor-pointer items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${
          !canEdit || isLoading
            ? 'cursor-not-allowed bg-slate-300'
            : 'bg-slate-900 hover:bg-slate-700'
        }`}>
          {isLoading ? 'Uploading…' : 'Upload'}
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
      {uploadError && (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{uploadError}</p>
      )}
      {deleteError && (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{deleteError}</p>
      )}
      {!canEdit && (
        <p className="mt-2 text-xs text-slate-400">You don't have permission to upload documents.</p>
      )}

      <div className="mt-3 space-y-2">
        {documents.length === 0 ? <p className="text-sm text-slate-500">No documents yet</p> : null}

        {documents.map((item) => (
          <a
            key={item.id}
            href={item.file_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-cyan-300"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {item.mime_type ?? 'file'} · {formatFileSize(item.size_bytes)}{item.user_id && membersByUserId[item.user_id] ? ` · ${membersByUserId[item.user_id]}` : ''} · {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
            {item.user_id === currentUserId && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); void deleteDocument(item) }}
                className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-rose-500"
                title="Delete document"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6 2h4a1 1 0 0 1 1 1H5a1 1 0 0 1 1-1ZM3 4h10l-1 10H4L3 4Zm3 2v6h1V6H6Zm3 0v6h1V6H9Z" />
                </svg>
              </button>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
