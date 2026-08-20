import type { ProjectDisplayRolePreview } from '../../../../../lib/pm'

interface DisplayRolesCardProps {
  canManageMemberRoles: boolean
  selectedProjectId: string | null
  newDisplayRole: string
  onNewDisplayRoleChange: (value: string) => void
  onAddDisplayRole: () => void
  isCreatingDisplayRole: boolean
  isDisplayRolesLoading: boolean
  displayRoleOptions: string[]
  customDisplayRoles: ProjectDisplayRolePreview[]
  isDeletingDisplayRoleById: Record<string, boolean>
  onRemoveCustomDisplayRole: (role: ProjectDisplayRolePreview) => void
  defaultDisplayRoles: string[]
}

export function DisplayRolesCard({
  canManageMemberRoles,
  selectedProjectId,
  newDisplayRole,
  onNewDisplayRoleChange,
  onAddDisplayRole,
  isCreatingDisplayRole,
  isDisplayRolesLoading,
  displayRoleOptions,
  customDisplayRoles,
  isDeletingDisplayRoleById,
  onRemoveCustomDisplayRole,
  defaultDisplayRoles,
}: DisplayRolesCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Display roles</p>
      <p className="px-1 text-xs text-slate-500">
        Visual labels for team responsibilities. They do not affect access rights.
      </p>

      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="text"
          value={newDisplayRole}
          onChange={(event) => onNewDisplayRoleChange(event.target.value)}
          placeholder="e.g., UX Writer"
          disabled={!canManageMemberRoles || !selectedProjectId || isCreatingDisplayRole}
          className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600"
        />
        <button
          type="button"
          onClick={onAddDisplayRole}
          disabled={!canManageMemberRoles || !selectedProjectId || isCreatingDisplayRole}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          {isCreatingDisplayRole ? 'Adding...' : 'Add role'}
        </button>
      </div>

      {isDisplayRolesLoading ? (
        <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">
          Loading display roles...
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {displayRoleOptions.map((roleName) => {
          const isDefaultRole = defaultDisplayRoles.some(
            (defaultRole) => defaultRole.toLowerCase() === roleName.toLowerCase(),
          )
          const customRole = customDisplayRoles.find(
            (item) => item.name.trim().toLowerCase() === roleName.trim().toLowerCase(),
          )
          const isDeletingCustomRole = customRole ? Boolean(isDeletingDisplayRoleById[customRole.id]) : false

          return (
            <span
              key={roleName}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
            >
              {roleName}
              {!isDefaultRole ? (
                <button
                  type="button"
                  onClick={() => {
                    if (customRole) {
                      onRemoveCustomDisplayRole(customRole)
                    }
                  }}
                  disabled={!canManageMemberRoles || isDeletingCustomRole}
                  className="rounded px-1 text-[10px] text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                  aria-label={`Remove display role ${roleName}`}
                  title="Remove custom role"
                >
                  {isDeletingCustomRole ? '...' : 'x'}
                </button>
              ) : null}
            </span>
          )
        })}
      </div>
    </div>
  )
}
