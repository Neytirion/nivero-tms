# Architecture Decisions & Patterns

This document outlines key architectural decisions made in the Nivero PM Tool project.

## 1. Atomic Project Creation from AI Draft

**Decision**: Implement atomic transaction for creating project + estimate + work packages + tasks from AI-generated draft.

**Problem Solved**:
- Previous implementation created resources sequentially (7+ separate API calls)
- Any failure left database in inconsistent state (partial project, orphaned estimates, etc.)
- No rollback mechanism

**Solution** (Phase 21):
- Single PostgreSQL RPC function `create_project_from_ai_draft()` handles entire workflow
- Entire transaction succeeds or rolls back completely
- All work packages, task-to-work-package links, and metadata created in single operation

**Benefits**:
- ✓ Data consistency guaranteed
- ✓ Atomic guarantee at database level
- ✓ Simplified error handling (all-or-nothing semantics)
- ✓ Reduced round-trip latency (1 request vs 7+)

**Files**:
- Backend: [supabase/mvp_phase21_atomic_project_creation.sql](../supabase/mvp_phase21_atomic_project_creation.sql)
- Client: [src/lib/ai/ai-mapper.ts](../src/lib/ai/ai-mapper.ts)
- Tests: [src/lib/pm.ai-draft.test.ts](../src/lib/pm.ai-draft.test.ts)

---

## 2. Centralized Workspace State Management

**Current Pattern**:
- [useDashboardPreview](../src/features/dashboard/useDashboardPreview.ts) provides global workspace state
- Distributed via [WorkspaceContext](../src/features/dashboard/workspace-context.tsx)
- Contains projects, tasks, members, permissions, and metadata

**Strengths**:
- Single source of truth for workspace data
- Integrated permission checks and access control
- Synchronization across all pages automatic

**Known Issues** (To Address in Future Phases):
- Single large hook (218 lines) contains multiple domains
- Dependency array suppressions (react-hooks/exhaustive-deps)
- Limited granularity for partial updates

**Future Direction**:
- Phase 22: Split into domain-specific slices (projects, tasks, members, time)
- Consider TanStack Query for fine-grained server state management
- Keep local UI state separate from domain state

---

## 3. Domain-Driven Data Access Layer

**Structure**:
```
src/lib/
  ├── pm.types.ts       (Type definitions aligned with DB schema)
  ├── pm.projects.ts    (Project operations)
  ├── pm.tasks.ts       (Task operations)
  ├── pm.estimates.ts   (Estimation workflow)
  ├── pm.members.ts     (Team membership)
  ├── pm.time.ts        (Time tracking)
  ├── pm.comments.ts    (Comments & mentions)
  ├── pm.documents.ts   (File storage)
  ├── pm.helpers.ts     (Shared validation logic)
  └── pm/               (Barrel exports)
```

**Principle**: All business operations go through `src/lib`, never directly from UI components.

**Challenges Identified**:
- Repeated SELECT field lists (e.g., [pm.projects.ts:9](../src/lib/pm.projects.ts#L9), [pm.tasks.ts:73](../src/lib/pm.tasks.ts#L73))
- Risk of field synchronization when schema changes
- No central query definition

**Future Improvement** (Phase 22):
- Centralize SELECT projections in constants or query builders
- Consider query builder library (e.g., Drizzle, Kysely for Supabase)

---

## 4. Feature-Based Code Organization

**Structure**:
```
src/features/
  ├── auth/           (Authentication hooks)
  ├── dashboard/      (Workspace state & context)
  ├── projects/       (Project UI components & hooks)
  │  ├── components/
  │  ├── hooks/
  │  └── utils/
  ├── tasks/          (Task UI & board logic)
  └── ...
```

**Benefits**:
- Clear module boundaries
- Feature-specific utilities isolated
- Component libraries separated by domain

**Current Status**: Working well for current scope (~4 main features)

---

## 5. Test Strategy

**Current Coverage** (20 test files):
- Unit tests for domain services (`pm.*.test.ts`)
- Unit tests for domain utilities (`*.test.ts`)
- Integration tests for page workflows (`*Page.test.tsx`)
- Component snapshot tests (partial)

**Missing** (High Priority):
- End-to-end scenarios (project creation → tasks → time tracking)
- Permission boundary tests (RBAC verification)
- Error recovery scenarios

**Next Steps** (Phase 22+):
- Add integration test suite for critical workflows
- Increase E2E test coverage for multi-step operations
- Automate permission regression tests

---

## 6. Error Handling & Validation

**Current Pattern**:
- Supabase RPC functions validate at database level (constraints, RLS)
- Client-side validation in domain services (TypeScript + runtime checks)
- UI controllers handle user-facing error messages

**Weakness**:
- No unified error code system (relying on plain Error strings)
- Hard to distinguish validation, permission, and system errors

**Improvement Planned** (Phase 22):
- Introduce error domain codes (e.g., `ERR_PROJECT_NOT_FOUND`, `ERR_PERMISSION_DENIED`)
- Typed error responses from domain services
- Localization-ready error messages

---

## 7. Page Controller Hooks Pattern

**Pattern**:
Large page controllers (`useProjectsPageController`, `useTasksPageController`, etc.) handle:
- Workspace state subscription
- Form state (inputs, validation)
- Permission checks
- API orchestration
- Dialog/modal state

**Current Sizes**:
- [useProjectsPageController](../src/pages/projects/useProjectsPageController.ts): 290 lines
- [useTasksPageController](../src/pages/tasks/useTasksPageController.ts): 309 lines
- [useTimeTrackingController](../src/pages/time-tracking/useTimeTrackingController.ts): 350 lines

**Plan** (Phase 22):
- Extract form state → `useXForm()` hooks
- Extract dialog logic → `useXDialogs()` hooks
- Extract async actions → `useXActions()` hooks
- Keep derived/computed state in main hook

---

## 8. Permission Model

**Roles**: owner, admin, manager, member

**Implementation**:
- Defined in [src/shared/utils/permissions.ts](../src/shared/utils/permissions.ts)
- Mirrored in PostgreSQL RLS policies and RPC functions
- Single source of truth in TypeScript (safer than async RPC checks)

**Pattern**: `hasProjectPermission(role, 'permission.string')` → boolean

**Future**: Consider capability-based access control (CBAC) for fine-grained delegation

---

## 9. Status Normalization

**Rationale**: Task/project statuses come in various formats from different sources.

**Solution**:
- Canonical forms defined in [src/features/tasks/constants.ts](../src/features/tasks/constants.ts)
- Normalization utilities in [src/shared/utils/task-status.ts](../src/shared/utils/task-status.ts)
- Consistent predicate functions (`isTaskClosedStatus()`, `isExecutionTaskStatus()`, etc.)

**Benefit**: UI and business logic operate on normalized enums, reducing bugs

---

## 10. Type Safety Approach

**Strategy**:
- `database.types.ts` auto-generated from Supabase (one-way sync)
- Domain types in `pm.types.ts` derive from database types using `Pick<>`
- Type-specific preview types (e.g., `ProjectPreview`, `TaskPreview`) for query results

**Example**:
```typescript
// DB row type
export type Project = Database['public']['Tables']['projects']['Row']

// Domain-specific projection
export type ProjectPreview = Pick<
  Project,
  | 'id'
  | 'name'
  | 'description'
  | 'owner_id'
  | ...
>
```

**Benefit**: Type safety from DB schema through UI, minimal type duplication

---

## 11. Hierarchical Hook Composition for Page Controllers

**Decision** (Phase 22): Split monolithic page controllers (300+ lines) into specialized single-responsibility hooks organized by domain.

**Problem Addressed**:
- Large page controllers (`useTimeTrackingController`, `useProjectsPageController`, etc.) mixed multiple concerns
- Difficult to test, understand, and maintain
- High cognitive load when adding features

**Solution**:
```typescript
// Composition pattern:
usePageController() {
  const filters = usePageFilters(data)
  const form = usePageForm()
  const modals = usePageModals()
  const actions = usePageActions(inputs)
  
  // Orchestrate composed hooks
  return { ...filters, ...form, ...modals, ...actions, derivedState, workspaceData }
}
```

**Applied To** (Phase 22 - Complete):
- **TimeTrackingPage**: 350→220 lines (4 hooks)
  - [useTimeTrackingFilters](../src/pages/time-tracking/useTimeTrackingFilters.ts) – project, week, edit mode
  - [useTimeTrackingManualForm](../src/pages/time-tracking/useTimeTrackingManualForm.ts) – form state
  - [useTimeTrackingTimer](../src/pages/time-tracking/useTimeTrackingTimer.ts) – timer lifecycle
  - [useTimeTrackingActions](../src/pages/time-tracking/useTimeTrackingActions.ts) – API calls, mutations
  - Testing: ✅ All 10 tests pass

- **ProjectsPage**: 294→230 lines (5 hooks)
  - [useProjectsPageFilters](../src/pages/projects/useProjectsPageFilters.ts) – search, tabs
  - [useProjectsMemberForm](../src/pages/projects/useProjectsMemberForm.ts) – member invite, roles
  - [useProjectsSettingsForm](../src/pages/projects/useProjectsSettingsForm.ts) – project metadata
  - [useProjectsModals](../src/pages/projects/useProjectsModals.ts) – dialog states
  - [useProjectsActions](../src/pages/projects/useProjectsActions.ts) – async handlers
  - Testing: ✅ All 3 tests pass

**Benefits**:
- ✓ Reduced cognitive load (30% avg complexity reduction)
- ✓ Single Responsibility Principle
- ✓ Improved testability
- ✓ Better code reuse across pages
- ✓ Clearer data flow and state management

**Tradeoffs**:
- More files to navigate (4-5 per page)
- Additional memoization calls
- Slightly more prop-drilling through composition

**See Also**: [phase-22-controller-refactoring.md](./phase-22-controller-refactoring.md) for detailed metrics and lessons learned

---

## Future Phases

1. **Phase 22c (Controller Refactoring - Final)**
   - Refactor [useTasksPageController](../src/pages/tasks/useTasksPageController.ts) (309 lines)
   - Apply same 5-hook pattern (filters, form, modals, actions, board-logic)

2. **Phase 23 (Integration Tests)**
   - End-to-end test workflows (project → estimate → tasks → time tracking)
   - Permission boundary tests
   - Time tracking rollup tests

3. **Phase 24 (State Management Upgrade)**
   - Consider TanStack Query for server state
   - Split workspace state into domain slices
   - Add optimistic updates for mutations

4. **Phase 25 (Documentation)**
   - API documentation (auto-generated from RPC functions)
   - Component storybook for UI library
   - Onboarding guide for developers

4. **Phase 25 (Documentation)**
   - API documentation (auto-generated from RPC functions)
   - Component storybook for UI library
   - Onboarding guide for developers

---

## Links to Key Files

- **Architecture**: This file (architecture-decisions.md)
- **Implementation Plan**: [mvp-implementation-plan.md](./mvp-implementation-plan.md)
- **Functional Spec**: [mvp-functional-spec.md](./mvp-functional-spec.md)
- **Domain Layer**: [src/lib/](../src/lib/)
- **Feature Modules**: [src/features/](../src/features/)
- **Database Migrations**: [supabase/](../supabase/)
