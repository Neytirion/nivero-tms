import { useMemo, useState } from 'react'
import type { AssignmentScopeFieldsProps } from './create-task-section.types'

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function getMemberInitials(input: string) {
  const compact = input.trim()
  if (!compact) {
    return '??'
  }

  const parts = compact.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function CreateTaskAssignmentScopeFields(props: AssignmentScopeFieldsProps) {
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [memberQuery, setMemberQuery] = useState('')
  const [workPackageQuery, setWorkPackageQuery] = useState('')
  const [dependencyQuery, setDependencyQuery] = useState('')

  const selectedWorkPackage = useMemo(
    () => props.workPackages.find((workPackage) => workPackage.id === props.taskWorkPackageId) ?? null,
    [props.taskWorkPackageId, props.workPackages],
  )

  const filteredWorkPackages = useMemo(() => {
    const normalizedQuery = normalize(workPackageQuery)
    if (!normalizedQuery) {
      return props.workPackages
    }

    return props.workPackages.filter((workPackage) => normalize(workPackage.name).includes(normalizedQuery))
  }, [props.workPackages, workPackageQuery])

  const filteredDependencies = useMemo(() => {
    const normalizedQuery = normalize(dependencyQuery)
    if (!normalizedQuery) {
      return props.dependencyOptions
    }

    return props.dependencyOptions.filter((task) => normalize(task.label).includes(normalizedQuery))
  }, [dependencyQuery, props.dependencyOptions])

  const displayRoleOptions = useMemo(() => {
    const unique = new Set<string>()

    for (const member of props.projectMembers) {
      const userId = member.user_id ?? ''
      if (!userId) {
        continue
      }

      const role = props.memberDisplayRoleByUserId[userId]
      if (role) {
        unique.add(role)
      }
    }

    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [props.memberDisplayRoleByUserId, props.projectMembers])

  const filteredMembers = useMemo(() => {
    const normalizedQuery = normalize(memberQuery)
    const selectedWorkPackageName = normalize(selectedWorkPackage?.name ?? '')

    const isRecommended = (displayRole: string | null) => {
      if (!selectedWorkPackageName || !displayRole) {
        return false
      }

      const normalizedDisplayRole = normalize(displayRole)
      return selectedWorkPackageName.includes(normalizedDisplayRole) || normalizedDisplayRole.includes(selectedWorkPackageName)
    }

    return props.projectMembers
      .filter((member) => Boolean(member.user_id))
      .map((member) => {
        const userId = member.user_id as string
        const fullName = member.full_name ?? member.email ?? userId
        const email = member.email ?? ''
        const displayRole = props.memberDisplayRoleByUserId[userId] ?? null

        return {
          member,
          userId,
          fullName,
          email,
          displayRole,
          recommendedForScope: isRecommended(displayRole),
        }
      })
      .filter((entry) => {
        if (roleFilter !== 'all' && entry.displayRole !== roleFilter) {
          return false
        }

        if (!normalizedQuery) {
          return true
        }

        const haystack = normalize(`${entry.fullName} ${entry.email} ${entry.displayRole ?? ''}`)
        return haystack.includes(normalizedQuery)
      })
      .sort((left, right) => {
        if (left.recommendedForScope !== right.recommendedForScope) {
          return left.recommendedForScope ? -1 : 1
        }

        return left.fullName.localeCompare(right.fullName)
      })
  }, [memberQuery, props.memberDisplayRoleByUserId, props.projectMembers, roleFilter, selectedWorkPackage?.name])

  const selectedAssigneeLabel = useMemo(() => {
    const selected = props.projectMembers.find((member) => member.user_id === props.taskAssigneeId)
    if (!selected) {
      return 'Unassigned'
    }

    return selected.full_name ?? selected.email ?? selected.user_id ?? 'Unassigned'
  }, [props.projectMembers, props.taskAssigneeId])

  const selectedDependencyLabel = useMemo(() => {
    const selected = props.dependencyOptions.find((task) => task.id === props.taskBlockedByTaskId)
    return selected?.label ?? 'None'
  }, [props.dependencyOptions, props.taskBlockedByTaskId])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">Assignment & Scope</h4>
      <p className="mt-1 text-xs text-slate-500">
        {props.useEstimates
          ? 'Link the task to estimate scope and optionally set an owner.'
          : 'Assign dependencies and optionally set an owner.'}
      </p>

      <div className="mt-3 space-y-3">
        {props.useEstimates ? (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="block text-sm font-medium text-slate-700">Work package (optional)</label>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                Current: {selectedWorkPackage?.name ?? 'No work package'}
              </span>
            </div>

            <div
              className={`rounded-lg border bg-slate-50 p-2.5 ${
                props.hasAttemptedSubmit && props.isWorkPackageMissing
                  ? 'border-rose-400 bg-rose-50/40'
                  : 'border-slate-200'
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => props.onTaskWorkPackageIdChange('')}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                    props.taskWorkPackageId
                      ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      : 'border-cyan-500 bg-cyan-100 text-cyan-900'
                  }`}
                >
                  No work package
                </button>

                <input
                  type="text"
                  value={workPackageQuery}
                  onChange={(event) => setWorkPackageQuery(event.target.value)}
                  placeholder="Search work package"
                  className="h-8 min-w-[180px] flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filteredWorkPackages.map((workPackage) => {
                  const isSelected = props.taskWorkPackageId === workPackage.id

                  return (
                    <button
                      key={workPackage.id}
                      type="button"
                      onClick={() => props.onTaskWorkPackageIdChange(workPackage.id)}
                      className={`text-left rounded-lg border p-2.5 transition ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-cyan-300'
                      }`}
                    >
                      <p className="truncate text-sm font-semibold text-slate-900">{workPackage.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {typeof workPackage.estimated_hours === 'number'
                          ? `${workPackage.estimated_hours}h planned`
                          : 'No estimate set'}
                      </p>
                    </button>
                  )
                })}
              </div>

              {props.workPackages.length > 0 && filteredWorkPackages.length === 0 ? (
                <p className="mt-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-500">
                  No work packages found for this search.
                </p>
              ) : null}
            </div>

            {props.workPackages.length === 0 && props.selectedProjectId ? (
              <p className="mt-1 text-[11px] text-rose-600">
                No active work packages found. Add packages in Project Details {'->'} Estimates.
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-700">Blocked by task</label>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              Current: {selectedDependencyLabel}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => props.onTaskBlockedByTaskIdChange('')}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  props.taskBlockedByTaskId
                    ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    : 'border-cyan-500 bg-cyan-100 text-cyan-900'
                }`}
              >
                None
              </button>

              <input
                type="text"
                value={dependencyQuery}
                onChange={(event) => setDependencyQuery(event.target.value)}
                placeholder="Search task dependency"
                className="h-8 min-w-[180px] flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDependencies.map((task) => {
                const isSelected = props.taskBlockedByTaskId === task.id

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => props.onTaskBlockedByTaskIdChange(task.id)}
                    className={`text-left rounded-lg border p-2.5 transition ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-cyan-300'
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">{task.label}</p>
                  </button>
                )
              })}
            </div>

            {props.dependencyOptions.length > 0 && filteredDependencies.length === 0 ? (
              <p className="mt-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-500">
                No dependency tasks found for this search.
              </p>
            ) : null}

            {props.dependencyOptions.length === 0 ? (
              <p className="mt-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-500">
                No available tasks to set as dependency.
              </p>
            ) : null}
          </div>
        </div>

        {props.canAssignAssignee ? (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="block text-sm font-medium text-slate-700">Assignee</label>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                Current: {selectedAssigneeLabel}
              </span>
            </div>
            {selectedWorkPackage ? (
              <p className="mb-2 text-xs text-slate-500">
                Members are prioritized when their secondary role matches {selectedWorkPackage.name}.
              </p>
            ) : null}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => props.onTaskAssigneeIdChange('')}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                    props.taskAssigneeId
                      ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      : 'border-cyan-500 bg-cyan-100 text-cyan-900'
                  }`}
                >
                  Unassigned
                </button>

                <input
                  type="text"
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Search by name, email, or role"
                  className="h-8 min-w-[180px] flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600"
                />
              </div>

              {displayRoleOptions.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      roleFilter === 'all'
                        ? 'border-cyan-500 bg-cyan-100 text-cyan-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    All roles
                  </button>
                  {displayRoleOptions.map((roleName) => (
                    <button
                      key={roleName}
                      type="button"
                      onClick={() => setRoleFilter(roleName)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        roleFilter === roleName
                          ? 'border-cyan-500 bg-cyan-100 text-cyan-900'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {roleName}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filteredMembers.map(({ member, userId, fullName, email, displayRole, recommendedForScope }) => {
                  const isSelected = props.taskAssigneeId === userId

                  return (
                    <button
                      key={member.member_id}
                      type="button"
                      onClick={() => props.onTaskAssigneeIdChange(userId)}
                      className={`text-left rounded-lg border p-2.5 transition ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-cyan-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={fullName}
                            className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-[10px] font-semibold text-slate-700">
                            {getMemberInitials(fullName)}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
                          <p className="truncate text-xs text-slate-500">{email || 'No email'}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                              {member.role ?? 'member'}
                            </span>
                            {displayRole ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-900">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden="true" />
                                {displayRole}
                              </span>
                            ) : null}
                            {recommendedForScope ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                                Matches work package
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {filteredMembers.length === 0 ? (
                <p className="mt-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-500">
                  No members found for this filter.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}