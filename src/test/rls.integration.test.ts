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
      notes: 'Should be blocked by RLS',
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
        notes: 'RLS happy path',
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
})
