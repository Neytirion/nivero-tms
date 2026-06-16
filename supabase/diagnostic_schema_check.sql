-- =============================================
-- DIAGNOSTIC: Run this FIRST in Supabase SQL Editor.
-- Read-only — no changes. Shows what is actually in the DB.
-- =============================================

-- 1. Duplicate FK constraints on auth.users columns.
--    Healthy state: max 1 FK per column. Count > 1 means drift.
select
  tc.table_name,
  kcu.column_name,
  count(*)           as fk_count,
  string_agg(tc.constraint_name, ', ' order by tc.constraint_name) as constraint_names
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
  and kcu.table_schema   = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
  and rc.constraint_schema = tc.constraint_schema
join information_schema.table_constraints tc2
  on tc2.constraint_name = rc.unique_constraint_name
  and tc2.table_schema   = rc.unique_constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema    = 'public'
  and tc2.table_schema   = 'auth'
  and tc2.table_name     = 'users'
group by tc.table_name, kcu.column_name
having count(*) > 1
order by tc.table_name, kcu.column_name;

-- 2. All FK constraints referencing auth.users — with ON DELETE action.
--    Look for original *_fkey entries that have no ON DELETE (confupdtype = 'a', confdeltype = 'a' means NO ACTION = RESTRICT).
--    These block user deletion and should be removed.
select
  c.conname                                     as constraint_name,
  c.conrelid::regclass                          as table_name,
  a.attname                                     as column_name,
  case c.confupdtype
    when 'a' then 'NO ACTION'
    when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE'
    when 'n' then 'SET NULL'
    when 'd' then 'SET DEFAULT'
  end                                           as on_update,
  case c.confdeltype
    when 'a' then 'NO ACTION / RESTRICT'
    when 'r' then 'RESTRICT'
    when 'c' then 'CASCADE'
    when 'n' then 'SET NULL'
    when 'd' then 'SET DEFAULT'
  end                                           as on_delete
from pg_constraint c
join pg_class r      on r.oid = c.conrelid
join pg_namespace ns on ns.oid = r.relnamespace
join pg_attribute a  on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
where c.contype = 'f'
  and ns.nspname = 'public'
  and c.confrelid = 'auth.users'::regclass
order by table_name, column_name, constraint_name;

-- 3. Missing critical data-integrity constraints.
--    Rows here = gaps that need to be filled by the cleanup migration.
select
  missing_constraint,
  description
from (values
  ('task_dependencies_not_self',       'task_dependencies: prevents self-dependency'),
  ('task_dependencies_unique_pair',    'task_dependencies: prevents duplicate dependency pairs'),
  ('projects_dates_order_check',       'projects: start_date <= end_date'),
  ('projects_hours_non_negative_check','projects: estimated_hours and actual_hours >= 0'),
  ('tasks_blocked_by_not_self_check',  'tasks: blocked_by_task_id <> id'),
  ('tasks_hours_non_negative_check',   'tasks: estimate_hours and actual_hours >= 0'),
  ('project_members_role_check',       'project_members: role in (member, admin, manager)')
) as expected(missing_constraint, description)
where not exists (
  select 1
  from pg_constraint
  where conname = expected.missing_constraint
);

-- 4. Missing unique index on project_members(project_id, user_id).
--    If this row appears, ON CONFLICT in invite_project_member_by_email will fail.
select
  'project_members_project_user_uidx' as missing_index,
  'Required for ON CONFLICT (project_id, user_id) in RPC functions' as description
where not exists (
  select 1
  from pg_indexes
  where schemaname = 'public'
    and tablename  = 'project_members'
    and indexname  = 'project_members_project_user_uidx'
);

-- 5. RLS status for all public tables.
--    All tables should show relrowsecurity = true.
select
  relname as table_name,
  relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by relname;

-- 6. All RLS policies summary (name + command + roles).
select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
