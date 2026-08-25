import { useState } from 'react'
import { CreateTaskAssignmentScopeFields } from './CreateTaskAssignmentScopeFields'
import { CreateTaskCoreFields } from './CreateTaskCoreFields'
import { CreateTaskFooter } from './CreateTaskFooter'
import { CreateTaskPlanningFields } from './CreateTaskPlanningFields'
import type { CreateTaskSectionProps } from './create-task-section.types'

type CreateTaskSectionNavKey = 'basics' | 'planning' | 'assignment'

const sectionNavItems: { key: CreateTaskSectionNavKey; label: string; icon: string }[] = [
  { key: 'basics', label: 'Task Basics', icon: '▦' },
  { key: 'planning', label: 'Planning', icon: '≈' },
  { key: 'assignment', label: 'Assignment & Scope', icon: '◉' },
]

export function CreateTaskSection({
  useEstimates,
  selectedProjectId,
  selectedProject,
  isProjectMissing,
  isTaskTitleMissing,
  isEstimateHoursMissingOrInvalid,
  isWorkPackageMissing,
  taskTitle,
  taskDescription,
  taskEstimateHours,
  taskPriority,
  taskDueDate,
  taskWorkPackageId,
  taskBlockedByTaskId,
  taskAssigneeId,
  projectStartDate,
  projectEndDate,
  workPackages,
  dependencyOptions,
  canAssignAssignee,
  projectMembers,
  memberDisplayRoleByUserId,
  missingRequiredFields,
  hasAttemptedSubmit,
  isLoading,
  canSubmit,
  onTaskTitleChange,
  onTaskDescriptionChange,
  onTaskEstimateHoursChange,
  onTaskPriorityChange,
  onTaskDueDateChange,
  onTaskWorkPackageIdChange,
  onTaskBlockedByTaskIdChange,
  onTaskAssigneeIdChange,
  onCreateTask,
  onSetHasAttemptedSubmit,
}: CreateTaskSectionProps) {
  const [activeSection, setActiveSection] = useState<CreateTaskSectionNavKey>('basics')

  const isCreationBlocked =
    !selectedProjectId ||
    isLoading

  const handleSectionNavigation = (section: CreateTaskSectionNavKey) => {
    setActiveSection(section)
  }

  return (
    <section className="page-section border border-slate-200 bg-[linear-gradient(170deg,#ffffff_0%,#f8fafc_58%,#eef2ff_100%)]">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Create Task</h3>
          <p className="mt-2 text-sm text-slate-600">
            Current project: <span className="text-base font-semibold text-slate-800">{selectedProject?.name ?? 'No project selected'}</span>
          </p>
        </div>
      </div>

      {hasAttemptedSubmit && missingRequiredFields.length > 0 ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          Missing required fields: {missingRequiredFields.join(', ')}.
        </div>
      ) : null}

      <nav className="mt-4 flex flex-wrap gap-2 2xl:hidden">
        {sectionNavItems.map(({ key, label, icon }) => {
          const isActive = activeSection === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSectionNavigation(key)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                isActive
                  ? 'border-slate-300 bg-slate-100 font-semibold text-slate-900'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="w-4 shrink-0 text-center text-sm leading-none">{icon}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-4 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
            {(activeSection === 'basics' || activeSection === 'planning') ? (
              <div className="space-y-4 xl:col-span-6 2xl:col-span-5">
                {activeSection === 'basics' ? (
                  <CreateTaskCoreFields
                    selectedProject={selectedProject}
                    hasAttemptedSubmit={hasAttemptedSubmit}
                    isProjectMissing={isProjectMissing}
                    isTaskTitleMissing={isTaskTitleMissing}
                    taskTitle={taskTitle}
                    taskDescription={taskDescription}
                    onTaskTitleChange={onTaskTitleChange}
                    onTaskDescriptionChange={onTaskDescriptionChange}
                  />
                ) : null}

                {activeSection === 'planning' ? (
                  <CreateTaskPlanningFields
                    useEstimates={useEstimates}
                    hasAttemptedSubmit={hasAttemptedSubmit}
                    isEstimateHoursMissingOrInvalid={isEstimateHoursMissingOrInvalid}
                    taskEstimateHours={taskEstimateHours}
                    taskPriority={taskPriority}
                    taskDueDate={taskDueDate}
                    projectStartDate={projectStartDate}
                    projectEndDate={projectEndDate}
                    onTaskEstimateHoursChange={onTaskEstimateHoursChange}
                    onTaskPriorityChange={onTaskPriorityChange}
                    onTaskDueDateChange={onTaskDueDateChange}
                  />
                ) : null}
              </div>
            ) : null}

            {activeSection === 'assignment' ? (
              <div className="xl:col-span-12">
                <CreateTaskAssignmentScopeFields
                  useEstimates={useEstimates}
                  selectedProjectId={selectedProjectId}
                  hasAttemptedSubmit={hasAttemptedSubmit}
                  isWorkPackageMissing={isWorkPackageMissing}
                  taskWorkPackageId={taskWorkPackageId}
                  taskBlockedByTaskId={taskBlockedByTaskId}
                  taskAssigneeId={taskAssigneeId}
                  workPackages={workPackages}
                  dependencyOptions={dependencyOptions}
                  canAssignAssignee={canAssignAssignee}
                  projectMembers={projectMembers}
                  memberDisplayRoleByUserId={memberDisplayRoleByUserId}
                  onTaskWorkPackageIdChange={onTaskWorkPackageIdChange}
                  onTaskBlockedByTaskIdChange={onTaskBlockedByTaskIdChange}
                  onTaskAssigneeIdChange={onTaskAssigneeIdChange}
                />
              </div>
            ) : null}
          </div>
        </div>

        <nav className="sticky top-4 hidden w-52 shrink-0 rounded-xl border border-slate-200 bg-white py-2 2xl:block">
          <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Navigate</p>
          {sectionNavItems.map(({ key, label, icon }) => {
            const isActive = activeSection === key

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSectionNavigation(key)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className="w-4 shrink-0 text-center text-sm leading-none">{icon}</span>
                <span className="flex-1">{label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-5 flex justify-end">
        <CreateTaskFooter
          selectedProject={selectedProject}
          selectedProjectId={selectedProjectId}
          canSubmit={canSubmit}
          missingRequiredFields={missingRequiredFields}
          isLoading={isLoading}
          onCreateTask={onCreateTask}
          isCreationBlocked={isCreationBlocked}
          onSetHasAttemptedSubmit={onSetHasAttemptedSubmit}
        />
      </div>
    </section>
  )
}
