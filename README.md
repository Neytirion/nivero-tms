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
    AuthPage.tsx
    AppShell.tsx
    ProfilePage.tsx
    ProjectsPage.tsx
    TasksPage.tsx
  features/
    auth/
    dashboard/
    projects/
      hooks/
      components/
    tasks/
      hooks/
      components/
      constants.ts
  lib/
    supabase.ts
    pm.ts
    database.types.ts
```

## Supabase Migrations & RLS

To set up the database and enable security policies, run these SQL files in order in Supabase SQL Editor:

1. **Core Setup**: `supabase/policies_crud.sql` (RLS policies)
2. **Phase 1**: `supabase/mvp_phase1_schema.sql` (data model & triggers)
3. **Phase 2**: `supabase/mvp_phase2_hardening.sql` (RLS hardening)
4. **Phase 3**: `supabase/mvp_phase3_estimates_module.sql` (estimates & work packages)
5. **Phase 4**: `supabase/mvp_phase4_flow_core.sql` (task flow & progress)
6. **Phase 5**: `supabase/mvp_phase5_task_work_package_link.sql` (task-work package linking)
7. **Phase 6**: `supabase/mvp_phase6_progress_from_tasks.sql` (completion-based progress)
8. **Phase 7**: `supabase/mvp_phase7_task_assignee_update_policy.sql` (assignee permissions)
9. **Phase 8**: `supabase/mvp_phase8_database_integrity.sql` (FK constraints & indices)

Run each file content in Supabase SQL Editor in order.

## Avatar Upload Setup

Profile avatar upload uses Supabase Storage bucket named "avatars".

1. Create bucket "avatars" in Supabase Storage.
2. Configure bucket to allow authenticated users to upload files.
3. Ensure uploaded files are readable by app users (public bucket or proper read policy).

## Product Planning Docs

- [MVP Functional Specification](docs/mvp-functional-spec.md)
- [MVP Implementation Plan](docs/mvp-implementation-plan.md)
