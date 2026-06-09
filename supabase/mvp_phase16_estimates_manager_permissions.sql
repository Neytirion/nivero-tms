-- Phase 16: Allow managers to access and edit estimate drafts/work packages.
-- Keeps read access for all project members.

alter table public.estimates enable row level security;
alter table public.work_packages enable row level security;

drop policy if exists "Estimates update by owner admin" on public.estimates;
create policy "Estimates update by owner admin manager"
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
      and lower(coalesce(pm.role, '')) in ('admin', 'manager')
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
      and lower(coalesce(pm.role, '')) in ('admin', 'manager')
  )
);

drop policy if exists "Estimates delete by owner admin" on public.estimates;
create policy "Estimates delete by owner admin manager"
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
      and lower(coalesce(pm.role, '')) in ('admin', 'manager')
  )
);

drop policy if exists "Work packages insert by owner admin" on public.work_packages;
create policy "Work packages insert by owner admin manager"
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
      and (p.owner_id = auth.uid() or lower(coalesce(pm.role, '')) in ('admin', 'manager'))
  )
);

drop policy if exists "Work packages update by owner admin" on public.work_packages;
create policy "Work packages update by owner admin manager"
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
      and (p.owner_id = auth.uid() or lower(coalesce(pm.role, '')) in ('admin', 'manager'))
  )
)
with check (
  exists (
    select 1
    from public.estimates e
    left join public.projects p on p.id = e.project_id
    left join public.project_members pm on pm.project_id = e.project_id and pm.user_id = auth.uid()
    where e.id = work_packages.estimate_id
      and (p.owner_id = auth.uid() or lower(coalesce(pm.role, '')) in ('admin', 'manager'))
  )
);

drop policy if exists "Work packages delete by owner admin" on public.work_packages;
create policy "Work packages delete by owner admin manager"
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
      and (p.owner_id = auth.uid() or lower(coalesce(pm.role, '')) in ('admin', 'manager'))
  )
);

notify pgrst, 'reload schema';
