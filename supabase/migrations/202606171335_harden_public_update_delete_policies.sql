do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comment_mentions'
      and policyname = 'Comment mentions update by author or admin'
  ) then
    execute $sql$
      alter policy "Comment mentions update by author or admin"
      on public.comment_mentions
      to authenticated
      using (
        (
          (mentioned_by_user_id = auth.uid())
          or exists (
            select 1
            from projects p
            where p.id = comment_mentions.project_id
              and p.owner_id = auth.uid()
          )
          or exists (
            select 1
            from project_members pm
            where pm.project_id = comment_mentions.project_id
              and pm.user_id = auth.uid()
              and lower(coalesce(pm.role, '')) = any (array['admin', 'manager'])
          )
        )
      )
      with check (
        (
          (mentioned_by_user_id = auth.uid())
          or exists (
            select 1
            from projects p
            where p.id = comment_mentions.project_id
              and p.owner_id = auth.uid()
          )
          or exists (
            select 1
            from project_members pm
            where pm.project_id = comment_mentions.project_id
              and pm.user_id = auth.uid()
              and lower(coalesce(pm.role, '')) = any (array['admin', 'manager'])
          )
        )
      )
    $sql$;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comment_mentions'
      and policyname = 'Comment mentions delete by author or admin'
  ) then
    execute $sql$
      alter policy "Comment mentions delete by author or admin"
      on public.comment_mentions
      to authenticated
    $sql$;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'project_documents'
      and policyname = 'Project documents update by author or admin'
  ) then
    execute $sql$
      alter policy "Project documents update by author or admin"
      on public.project_documents
      to authenticated
      using (
        (
          (user_id = auth.uid())
          or exists (
            select 1
            from projects p
            where p.id = project_documents.project_id
              and p.owner_id = auth.uid()
          )
          or exists (
            select 1
            from project_members pm
            where pm.project_id = project_documents.project_id
              and pm.user_id = auth.uid()
              and lower(coalesce(pm.role, '')) = any (array['admin', 'manager'])
          )
        )
      )
      with check (
        (
          (user_id = auth.uid())
          or exists (
            select 1
            from projects p
            where p.id = project_documents.project_id
              and p.owner_id = auth.uid()
          )
          or exists (
            select 1
            from project_members pm
            where pm.project_id = project_documents.project_id
              and pm.user_id = auth.uid()
              and lower(coalesce(pm.role, '')) = any (array['admin', 'manager'])
          )
        )
      )
    $sql$;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'task_dependencies'
      and policyname = 'Task deps update by owner or admin'
  ) then
    execute $sql$
      alter policy "Task deps update by owner or admin"
      on public.task_dependencies
      to authenticated
      using (
        exists (
          select 1
          from tasks t
          left join projects p on p.id = t.project_id
          left join project_members pm on pm.project_id = t.project_id and pm.user_id = auth.uid()
          where t.id = task_dependencies.task_id
            and (
              p.owner_id = auth.uid()
              or coalesce(pm.role, 'member') = 'admin'
            )
        )
      )
      with check (
        exists (
          select 1
          from tasks t
          left join projects p on p.id = t.project_id
          left join project_members pm on pm.project_id = t.project_id and pm.user_id = auth.uid()
          where t.id = task_dependencies.task_id
            and (
              p.owner_id = auth.uid()
              or coalesce(pm.role, 'member') = 'admin'
            )
        )
      )
    $sql$;
  end if;
end
$$;

notify pgrst, 'reload schema';
