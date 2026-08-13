-- Phase 24: Mentions inbox and read-state.

alter table public.comment_mentions
  add column if not exists read_at timestamptz;

create index if not exists comment_mentions_unread_idx
  on public.comment_mentions (mentioned_user_id, created_at desc)
  where read_at is null;

drop policy if exists "Comment mentions update own read state" on public.comment_mentions;
create policy "Comment mentions update own read state"
on public.comment_mentions
for update
to authenticated
using (
  mentioned_user_id = auth.uid()
  and (
    exists (
      select 1
      from public.projects p
      where p.id = comment_mentions.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = comment_mentions.project_id
        and pm.user_id = auth.uid()
    )
  )
)
with check (
  mentioned_user_id = auth.uid()
  and (
    exists (
      select 1
      from public.projects p
      where p.id = comment_mentions.project_id
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = comment_mentions.project_id
        and pm.user_id = auth.uid()
    )
  )
);

notify pgrst, 'reload schema';
