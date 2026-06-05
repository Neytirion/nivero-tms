-- Phase 3: Estimates module
-- Run after:
--   1) supabase/policies_crud.sql
--   2) supabase/mvp_phase1_schema.sql
--   3) supabase/invite_member_by_email.sql
--   4) supabase/mvp_phase2_hardening.sql (recommended)

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimates_status_check check (status in ('draft', 'approved', 'superseded')),
  constraint estimates_version_positive_check check (version_number > 0),
  constraint estimates_project_version_unique unique (project_id, version_number)
);

create table if not exists public.work_packages (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  name text not null,
  estimated_hours numeric(10,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint work_packages_hours_non_negative_check check (estimated_hours >= 0)
);

create index if not exists estimates_project_status_idx
  on public.estimates (project_id, status);

create index if not exists work_packages_estimate_sort_idx
  on public.work_packages (estimate_id, sort_order);

alter table public.estimates enable row level security;
alter table public.work_packages enable row level security;

-- Read: project owner or member can see estimates/work packages.
drop policy if exists "Estimates visible to members" on public.estimates;
create policy "Estimates visible to members"
on public.estimates
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = estimates.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = estimates.project_id
      and pm.user_id = auth.uid()
  )
);

-- Create version: any project member can create draft estimate.
drop policy if exists "Estimates insert by members" on public.estimates;
create policy "Estimates insert by members"
on public.estimates
for insert
to authenticated
with check (
  created_by = auth.uid()
  and status = 'draft'
  and (
    exists (
      select 1
      from public.projects p
      where p.id = estimates.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = estimates.project_id
        and pm.user_id = auth.uid()
    )
  )
);

-- Update/approve: only project owner or admin can update estimate status/content.
drop policy if exists "Estimates update by owner admin" on public.estimates;
create policy "Estimates update by owner admin"
on public.estimates
for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = estimates.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = estimates.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = estimates.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = estimates.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

drop policy if exists "Estimates delete by owner admin" on public.estimates;
create policy "Estimates delete by owner admin"
on public.estimates
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = estimates.project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = estimates.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

-- Work packages policies follow parent estimate visibility/editability.
drop policy if exists "Work packages visible to members" on public.work_packages;
create policy "Work packages visible to members"
on public.work_packages
for select
to authenticated
using (
  exists (
    select 1
    from public.estimates e
    left join public.projects p on p.id = e.project_id
    left join public.project_members pm on pm.project_id = e.project_id and pm.user_id = auth.uid()
    where e.id = work_packages.estimate_id
      and (p.owner_id = auth.uid() or pm.user_id is not null)
  )
);

drop policy if exists "Work packages insert by owner admin" on public.work_packages;
create policy "Work packages insert by owner admin"
on public.work_packages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.estimates e
    left join public.projects p on p.id = e.project_id
    left join public.project_members pm on pm.project_id = e.project_id and pm.user_id = auth.uid()
    where e.id = work_packages.estimate_id
      and (p.owner_id = auth.uid() or pm.role = 'admin')
  )
);

drop policy if exists "Work packages update by owner admin" on public.work_packages;
create policy "Work packages update by owner admin"
on public.work_packages
for update
to authenticated
using (
  exists (
    select 1
    from public.estimates e
    left join public.projects p on p.id = e.project_id
    left join public.project_members pm on pm.project_id = e.project_id and pm.user_id = auth.uid()
    where e.id = work_packages.estimate_id
      and (p.owner_id = auth.uid() or pm.role = 'admin')
  )
)
with check (
  exists (
    select 1
    from public.estimates e
    left join public.projects p on p.id = e.project_id
    left join public.project_members pm on pm.project_id = e.project_id and pm.user_id = auth.uid()
    where e.id = work_packages.estimate_id
      and (p.owner_id = auth.uid() or pm.role = 'admin')
  )
);

drop policy if exists "Work packages delete by owner admin" on public.work_packages;
create policy "Work packages delete by owner admin"
on public.work_packages
for delete
to authenticated
using (
  exists (
    select 1
    from public.estimates e
    left join public.projects p on p.id = e.project_id
    left join public.project_members pm on pm.project_id = e.project_id and pm.user_id = auth.uid()
    where e.id = work_packages.estimate_id
      and (p.owner_id = auth.uid() or pm.role = 'admin')
  )
);

-- Keep estimates.updated_at fresh.
create or replace function public.set_estimates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_estimates_set_updated_at on public.estimates;
create trigger trg_estimates_set_updated_at
before update on public.estimates
for each row
execute function public.set_estimates_updated_at();

notify pgrst, 'reload schema';
