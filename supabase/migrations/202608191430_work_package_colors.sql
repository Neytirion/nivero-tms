-- Add configurable color to work packages for task highlighting.

alter table public.work_packages
  add column if not exists color text not null default '#94a3b8';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'work_packages_color_hex_check'
  ) then
    alter table public.work_packages
      add constraint work_packages_color_hex_check
      check (color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end;
$$;

update public.work_packages
set color = '#94a3b8'
where color is null;

notify pgrst, 'reload schema';