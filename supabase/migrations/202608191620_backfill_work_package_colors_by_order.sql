-- Backfill deterministic per-estimate work package colors by order for existing rows.

with palette as (
  select array[
    '#3b82f6', -- blue
    '#ef4444', -- red
    '#10b981', -- emerald
    '#f59e0b', -- amber
    '#8b5cf6', -- violet
    '#06b6d4', -- cyan
    '#f97316', -- orange
    '#84cc16'  -- lime
  ]::text[] as colors
), ranked as (
  select
    wp.id,
    row_number() over (
      partition by wp.estimate_id
      order by wp.sort_order asc, wp.created_at asc, wp.id asc
    ) - 1 as zero_based_index
  from public.work_packages wp
)
update public.work_packages wp
set color = p.colors[(r.zero_based_index % array_length(p.colors, 1)) + 1]
from ranked r
cross join palette p
where wp.id = r.id
  and (wp.color is null or wp.color = '#94a3b8');

notify pgrst, 'reload schema';
