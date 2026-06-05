interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmText: string
  cancelText?: string
  tone?: 'neutral' | 'danger' | 'success'
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

const toneStyles: Record<NonNullable<ConfirmDialogProps['tone']>, string> = {
  neutral: 'bg-slate-900 text-white hover:bg-slate-800',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500',
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  tone = 'neutral',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        onClick={onCancel}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${toneStyles[tone]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
