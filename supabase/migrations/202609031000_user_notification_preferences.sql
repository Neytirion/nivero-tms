create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slack_enabled boolean not null default true,
  email_enabled boolean not null default true,
  mention_alerts boolean not null default true,
  task_assignments boolean not null default true,
  task_updates boolean not null default true,
  project_invites boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_notification_preferences_updated_at_idx
  on public.user_notification_preferences (updated_at);

alter table public.user_notification_preferences enable row level security;

drop policy if exists "Users can view own notification preferences" on public.user_notification_preferences;
create policy "Users can view own notification preferences"
on public.user_notification_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can manage own notification preferences" on public.user_notification_preferences;
create policy "Users can manage own notification preferences"
on public.user_notification_preferences
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists user_notification_preferences_set_updated_at on public.user_notification_preferences;
create trigger user_notification_preferences_set_updated_at
before update on public.user_notification_preferences
for each row
execute function public.set_row_updated_at();

notify pgrst, 'reload schema';
