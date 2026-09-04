# Nivero PM Tool

Project management web app built with React + TypeScript + Vite + Supabase.

## Features

- Email/password authentication (sign in/sign up)
- Profile page (view and update profile metadata)
- Projects page (create, select, delete projects)
- Tasks page with Kanban board:
  - To Do / In Progress / Done columns
  - drag-and-drop between columns
  - create, move, delete tasks
- Client intake form for creating project tasks
- Supabase Realtime updates for new tasks in the active project
- Project comments, mentions, team access, estimates, reports, and time tracking
- Modular structure: pages, features, and lib layers

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Supabase (Auth + Postgres + RLS)

## Environment Variables

Create a `.env` file in project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_or_publishable_key
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - type-check and production build
- `npm run preview` - preview production build
- `npm run lint` - lint code

## Structure

```text
src/
  pages/
    AppShell.tsx
    auth/
      AuthPage.tsx
      ForgotPasswordPage.tsx
      ResetPasswordPage.tsx
    dashboard/
      DashboardPage.tsx
      useDashboardPageController.ts
    profile/
      ProfilePage.tsx
      useProfileDetails.ts
      useAvatarUpload.ts
      usePasswordChange.ts
    projects/
      ProjectsPage.tsx
      useProjectsPageController.ts
      useProjectsActions.ts
    tasks/
      TasksPage.tsx
      useTasksPageController.ts
      views/
    time-tracking/
      TimeTrackingPage.tsx
      useTimeTrackingController.ts
    resource-planning/
      ResourcePlanningPage.tsx
  features/
    auth/
    dashboard/
    projects/
      components/
      hooks/
      utils/
        client-brief/
    tasks/
      components/
      hooks/
      constants.ts
  shared/
    components/
    utils/
  lib/
    ai/
    database.types.ts
    supabase.ts
    pm/
      index.ts
      types.ts
      helpers.ts
      projects/
      tasks/
      estimates/
      members/
      time/
      comments/
      collaboration/
      documents/
```

## Supabase Setup

The repository contains the canonical schema and incremental migrations. For a new environment, apply the base schema and policies first, then apply every file in `supabase/migrations` in filename order. With the Supabase CLI:

```bash
supabase db push
```

For an existing environment, do not replay the old phase scripts. Apply only migrations that have not been applied yet.

The important capabilities covered by the current migrations include:

- RLS policies and permission hardening;
- atomic AI project creation;
- project client intake and attachments;
- task assignment and claim rules;
- estimates, work packages, display roles, and time-entry constraints;
- `tasks` in the `supabase_realtime` publication for live client-intake task updates.

The legacy/manual phase files are still useful as historical reference. The current incremental migration directory is the source of truth for an already initialized database.

### Base SQL files

For a manual SQL Editor setup, apply these foundational files first:

1. **Core Setup**: `supabase/policies_crud.sql` (RLS policies)
2. **Phase 1**: `supabase/mvp_phase1_schema.sql` (data model & triggers)
3. **Phase 2**: `supabase/mvp_phase2_hardening.sql` (RLS hardening)
4. **Phase 3**: `supabase/mvp_phase3_estimates_module.sql` (estimates & work packages)
5. **Phase 4**: `supabase/mvp_phase4_flow_core.sql` (task flow & progress)
6. **Phase 5**: `supabase/mvp_phase5_task_work_package_link.sql` (task-work package linking)
7. **Phase 6**: `supabase/mvp_phase6_progress_from_tasks.sql` (completion-based progress)
8. **Phase 7**: `supabase/mvp_phase7_task_assignee_update_policy.sql` (assignee permissions)
9. **Phase 8**: `supabase/mvp_phase8_database_integrity.sql` (FK constraints & indices)
10. **Phase 21**: `supabase/mvp_phase21_atomic_project_creation.sql` (atomic AI draft → project flow)

After the base files, apply the files in `supabase/migrations` in timestamp order.

### Realtime verification

After applying migrations, open the same project in two browser sessions:

1. Keep the Kanban open in session A.
2. Submit a client request in session B.
3. The new task should appear in session A without a page refresh.

If it does not, check that `public.tasks` is listed in the Supabase `supabase_realtime` publication and inspect the browser console for channel errors.

## Typed Domain Errors

Domain operations use `DomainError` from `src/lib/errors.ts` for stable error classification while preserving user-facing messages:

```ts
import { isDomainError } from './lib/errors'

try {
  await updateTask(taskId, patch)
} catch (error) {
  if (isDomainError(error) && error.code === 'PERMISSION_DENIED') {
    // Show a permission-specific action or message.
  }
}
```

Available codes include `AUTH_REQUIRED`, `PERMISSION_DENIED`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `DATABASE_ERROR`, `NETWORK_ERROR`, and `UNKNOWN_ERROR`.

Use the code for application behavior and the message for display. Do not branch on `error.message.includes(...)` in new code.

## Testing

Run the full checks before merging:

```bash
npm run lint
npm run test
npm run build
```

The test suite includes domain unit tests, page/component tests, and Supabase RLS integration tests when the test environment is configured. The two-account Realtime scenario should be verified manually until an authenticated browser E2E suite is added.

## Avatar Upload Setup

Profile avatar upload uses Supabase Storage bucket named "avatars".

1. Create bucket "avatars" in Supabase Storage.
2. Configure bucket to allow authenticated users to upload files.
3. Ensure uploaded files are readable by app users (public bucket or proper read policy).

## Product Planning Docs

- [MVP Functional Specification](docs/mvp-functional-spec.md)
- [MVP Implementation Plan](docs/mvp-implementation-plan.md)
