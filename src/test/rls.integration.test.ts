import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'

type TestClient = SupabaseClient<Database>

const supabaseUrl = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const ownerEmail = process.env.VITE_RLS_OWNER_EMAIL
const ownerPassword = process.env.VITE_RLS_OWNER_PASSWORD
const adminEmail = process.env.VITE_RLS_ADMIN_EMAIL
const adminPassword = process.env.VITE_RLS_ADMIN_PASSWORD

const hasRlsEnv = Boolean(
  supabaseUrl &&
    publishableKey &&
    serviceRoleKey &&
    ownerEmail &&
    ownerPassword &&
    adminEmail &&
    adminPassword,
)

const describeRls = hasRlsEnv ? describe : describe.skip

function createTestClient(apiKey: string): TestClient {
  return createClient<Database>(supabaseUrl!, apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

async function signIn(email: string, password: string): Promise<TestClient> {
  const client = createTestClient(publishableKey!)
  const { error } = await client.auth.signInWithPassword({ email, password })

  if (error) {
    throw error
  }

  return client
}

describeRls('Supabase RLS integration', () => {
  let adminClient: TestClient
  let ownerClient: TestClient
  let projectAdminClient: TestClient

  let ownerId: string
  let projectAdminId: string
  let visibleProjectId: string
  let hiddenProjectId: string
  let taskId: string

  beforeAll(async () => {
    adminClient = createTestClient(serviceRoleKey!)

    ownerClient = await signIn(ownerEmail!, ownerPassword!)
    projectAdminClient = await signIn(adminEmail!, adminPassword!)

    const ownerUser = await ownerClient.auth.getUser()
    const projectAdminUser = await projectAdminClient.auth.getUser()

    if (!ownerUser.data.user?.id || !projectAdminUser.data.user?.id) {
      throw new Error('RLS test users must be able to authenticate')
    }

    ownerId = ownerUser.data.user.id
    projectAdminId = projectAdminUser.data.user.id

    const seedSuffix = Date.now()

    const { data: visibleProject, error: visibleProjectError } = await adminClient
      .from('projects')
      .insert({
        name: `RLS Visible ${seedSuffix}`,
        owner_id: ownerId,
        status: 'active',
      })
      .select('id')
      .single()

    if (visibleProjectError || !visibleProject) {
      throw visibleProjectError ?? new Error('Failed to seed visible project')
    }

    visibleProjectId = visibleProject.id

    const { data: hiddenProject, error: hiddenProjectError } = await adminClient
      .from('projects')
      .insert({
        name: `RLS Hidden ${seedSuffix}`,
        owner_id: ownerId,
        status: 'active',
      })
      .select('id')
      .single()

    if (hiddenProjectError || !hiddenProject) {
      throw hiddenProjectError ?? new Error('Failed to seed hidden project')
    }

    hiddenProjectId = hiddenProject.id

    const { error: memberInsertError } = await adminClient.from('project_members').insert({
      project_id: visibleProjectId,
      user_id: projectAdminId,
      role: 'admin',
    })

    if (memberInsertError) {
      throw memberInsertError
    }

    const { data: task, error: taskError } = await ownerClient
      .from('tasks')
      .insert({
        project_id: visibleProjectId,
        title: `RLS Task ${seedSuffix}`,
        created_by: ownerId,
        assigned_to: projectAdminId,
        status: 'todo',
        priority: 'medium',
      })
      .select('id')
      .single()

    if (taskError || !task) {
      throw taskError ?? new Error('Failed to seed task')
    }

    taskId = task.id
  })

  afterAll(async () => {
    if (!hasRlsEnv) {
      return
    }

    await adminClient.from('time_entries').delete().in('project_id', [visibleProjectId, hiddenProjectId])
    await adminClient.from('tasks').delete().eq('project_id', visibleProjectId)
    await adminClient.from('project_members').delete().eq('project_id', visibleProjectId)
    await adminClient.from('projects').delete().in('id', [visibleProjectId, hiddenProjectId])

    await ownerClient.auth.signOut()
    await projectAdminClient.auth.signOut()
  })

  it('hides authenticated-only project data from anonymous clients', async () => {
    const anonymousClient = createTestClient(publishableKey!)

    const { data, error } = await anonymousClient
      .from('projects')
      .select('id,name')
      .in('id', [visibleProjectId, hiddenProjectId])

    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  it('shows project members only the projects they belong to', async () => {
    const { data, error } = await projectAdminClient
      .from('projects')
      .select('id,name')
      .in('id', [visibleProjectId, hiddenProjectId])

    expect(error).toBeNull()
    expect(data).toEqual([
      expect.objectContaining({
        id: visibleProjectId,
      }),
    ])
  })

  it('prevents project admin from deleting an owner-owned project at DB level', async () => {
    const { data, error } = await projectAdminClient
      .from('projects')
      .delete()
      .eq('id', visibleProjectId)
      .select('id')

    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)

    const { data: projectStillExists, error: existsError } = await adminClient
      .from('projects')
      .select('id')
      .eq('id', visibleProjectId)
      .single()

    expect(existsError).toBeNull()
    expect(projectStillExists?.id).toBe(visibleProjectId)
  })

  it('prevents project admin from inserting a time entry for another user', async () => {
    const { error } = await projectAdminClient.from('time_entries').insert({
      user_id: ownerId,
      project_id: visibleProjectId,
      task_id: taskId,
      entry_date: '2026-06-24',
      minutes_spent: 60,
      is_billable: true,
    })

    expect(error).not.toBeNull()
    expect(error?.message.toLowerCase()).toContain('row-level security')
  })

  it('allows project admin to insert a time entry only for themselves in a joined project', async () => {
    const { data, error } = await projectAdminClient
      .from('time_entries')
      .insert({
        user_id: projectAdminId,
        project_id: visibleProjectId,
        task_id: taskId,
        entry_date: '2026-06-24',
        minutes_spent: 45,
        is_billable: false,
      })
      .select('id,user_id,project_id,task_id,minutes_spent')
      .single()

    expect(error).toBeNull()
    expect(data).toMatchObject({
      user_id: projectAdminId,
      project_id: visibleProjectId,
      task_id: taskId,
      minutes_spent: 45,
    })
  })

  it('prevents project admin from updating member roles at DB level', async () => {
    // After our security fix, only the project owner should be able to update roles.
    // An admin updating their own membership role directly via DB should be blocked by RLS.
    const { data, error } = await projectAdminClient
      .from('project_members')
      .update({ role: 'manager' })
      .eq('project_id', visibleProjectId)
      .eq('user_id', projectAdminId)
      .select('role')

    // Either an RLS error is thrown OR the update returns 0 rows (silently blocked)
    const wasBlocked = error !== null || (data ?? []).length === 0
    expect(wasBlocked).toBe(true)

    // Verify the role did not change in the database
    const { data: current } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', visibleProjectId)
      .eq('user_id', projectAdminId)
      .single()

    expect(current?.role).toBe('admin')
  })

  it('prevents non-member from reading tasks in a project they do not belong to', async () => {
    const { data, error } = await projectAdminClient
      .from('tasks')
      .select('id')
      .eq('project_id', hiddenProjectId)

    expect(error).toBeNull()
    // projectAdmin is not a member of hiddenProject — should see 0 tasks
    expect(data ?? []).toHaveLength(0)
  })

  it('prevents non-member from inserting a task into a project they do not belong to', async () => {
    const { error } = await projectAdminClient
      .from('tasks')
      .insert({
        project_id: hiddenProjectId,
        title: 'Unauthorized task',
        created_by: projectAdminId,
        status: 'todo',
        priority: 'medium',
      })

    expect(error).not.toBeNull()
  })

  it('allows project owner to update member roles at DB level', async () => {
    // Owner should be the only one able to change roles
    const { error } = await ownerClient
      .from('project_members')
      .update({ role: 'member' })
      .eq('project_id', visibleProjectId)
      .eq('user_id', projectAdminId)

    expect(error).toBeNull()

    // Restore role for subsequent tests
    await adminClient
      .from('project_members')
      .update({ role: 'admin' })
      .eq('project_id', visibleProjectId)
      .eq('user_id', projectAdminId)
  })

  it('recalculates baseline progress, consumption, variance, and forecast', async () => {
    const suffix = Date.now()
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .insert({
        name: `RLS Health Baseline ${suffix}`,
        owner_id: ownerId,
        status: 'active',
        use_estimates: true,
      })
      .select('id')
      .single()

    expect(projectError).toBeNull()
    expect(project).not.toBeNull()
    const projectId = project!.id

    try {
      const { data: estimate, error: estimateError } = await adminClient
        .from('estimates')
        .insert({
          project_id: projectId,
          version_number: 1,
          status: 'approved',
          created_by: ownerId,
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      expect(estimateError).toBeNull()

      const { error: packageError } = await adminClient.from('work_packages').insert({
        estimate_id: estimate!.id,
        name: 'Delivery',
        estimated_hours: 100,
        sort_order: 0,
        is_active: true,
      })
      expect(packageError).toBeNull()

      const { data: tasks, error: tasksError } = await adminClient
        .from('tasks')
        .insert([
          { project_id: projectId, title: 'Done scope', created_by: ownerId, assigned_to: ownerId, status: 'done', priority: 'medium', estimate_hours: 40 },
          { project_id: projectId, title: 'Remaining scope', created_by: ownerId, assigned_to: ownerId, status: 'todo', priority: 'medium', estimate_hours: 60 },
        ])
        .select('id,status')
      expect(tasksError).toBeNull()

      const doneTaskId = tasks!.find((task) => task.status === 'done')!.id
      const { error: timeError } = await ownerClient.from('time_entries').insert({
        user_id: ownerId,
        project_id: projectId,
        task_id: doneTaskId,
        entry_date: new Date().toISOString().slice(0, 10),
        minutes_spent: 2640,
        is_billable: true,
      })
      expect(timeError).toBeNull()

      const { error: recalcError } = await adminClient.rpc('recalc_project_health', { p_project_id: projectId })
      expect(recalcError).toBeNull()

      const { data: health, error: healthError } = await adminClient
        .from('projects')
        .select('baseline_hours,actual_hours,progress_percent,hours_consumed_percent,hours_variance_percent,forecast_at_completion_percent,risk_status')
        .eq('id', projectId)
        .single()

      expect(healthError).toBeNull()
      expect(health).toMatchObject({
        baseline_hours: 100,
        actual_hours: 44,
        progress_percent: 40,
        hours_consumed_percent: 44,
        hours_variance_percent: 4,
        forecast_at_completion_percent: 110,
        risk_status: 'yellow',
      })
    } finally {
      await adminClient.from('projects').delete().eq('id', projectId)
    }
  })

  it('keeps risk unknown but calculates task-count progress without a baseline', async () => {
    const suffix = Date.now()
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .insert({
        name: `RLS Health Unknown ${suffix}`,
        owner_id: ownerId,
        status: 'active',
        use_estimates: false,
      })
      .select('id')
      .single()

    expect(projectError).toBeNull()
    const projectId = project!.id

    try {
      const { error: tasksError } = await adminClient.from('tasks').insert([
        { project_id: projectId, title: 'Done task', created_by: ownerId, status: 'done', priority: 'medium' },
        { project_id: projectId, title: 'Open task', created_by: ownerId, status: 'todo', priority: 'medium' },
      ])
      expect(tasksError).toBeNull()

      const { error: recalcError } = await adminClient.rpc('recalc_project_health', { p_project_id: projectId })
      expect(recalcError).toBeNull()

      const { data: health, error: healthError } = await adminClient
        .from('projects')
        .select('baseline_hours,progress_percent,hours_consumed_percent,forecast_at_completion_percent,risk_status,risk_reason')
        .eq('id', projectId)
        .single()

      expect(healthError).toBeNull()
      expect(health).toMatchObject({
        baseline_hours: null,
        progress_percent: 50,
        hours_consumed_percent: null,
        forecast_at_completion_percent: null,
        risk_status: 'unknown',
        risk_reason: 'No approved baseline or planned hours',
      })
    } finally {
      await adminClient.from('projects').delete().eq('id', projectId)
    }
  })
})
