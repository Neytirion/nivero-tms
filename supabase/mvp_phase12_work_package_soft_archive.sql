-- Phase 12: Soft-archive work packages instead of hard delete.
-- Keeps task links stable when estimate drafts change package composition.

alter table public.work_packages
  add column if not exists is_active boolean not null default true;

update public.work_packages
set is_active = true
where is_active is null;

create index if not exists work_packages_estimate_active_sort_idx
  on public.work_packages (estimate_id, is_active, sort_order);
