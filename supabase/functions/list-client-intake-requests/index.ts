export {}

declare const Deno: {
  env: { get(key: string): string | undefined }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function corsHeaders(req: Request): HeadersInit {
  return {
    'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function supabaseFetch(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY ?? '',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
      ...(init?.headers ?? {}),
    },
  })
}

function parseClientRequestDescription(description: string | null) {
  if (!description) return { request_details: '', attachments: [] as Array<{ name: string; url: string; is_image: boolean }> }

  const normalized = description.replace(/\r\n/g, '\n')
  const detailsMatch = normalized.match(/Request details:\s*\n([\s\S]*?)(?:\n\s*Attachments:\s*\n|\n\s*Internal description:\s*\n|$)/i)
  const attachmentsMatch = normalized.match(/\n\s*Attachments:\s*\n([\s\S]*?)(?:\n\s*Internal description:\s*\n|$)/i)
  const attachments: Array<{ name: string; url: string; is_image: boolean }> = []

  for (const line of (attachmentsMatch?.[1] ?? '').split('\n')) {
    const match = line.match(/^\s*(?:\d+\.\s*)?(.+?)\s*\|\s*(https?:\/\/\S+)\s*$/i)
    if (!match) continue
    const url = match[2].trim().replace(/[),.;]+$/g, '')
    if (!url) continue
    attachments.push({
      name: match[1].trim() || 'Attachment',
      url,
      is_image: /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)(?:\?|$)/i.test(url),
    })
  }

  return {
    request_details: (detailsMatch?.[1] ?? '').trim(),
    attachments: Array.from(new Map(attachments.map((attachment) => [attachment.url, attachment])).values()),
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json(req, { error: 'Missing Supabase environment variables' }, 500)

  let payload: { token?: unknown }
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: 'Invalid JSON payload' }, 400)
  }

  const token = typeof payload.token === 'string' ? payload.token.trim() : ''
  if (!isUuid(token)) return json(req, { error: 'Invalid project link token' }, 400)

  const projectResponse = await supabaseFetch(
    `/rest/v1/projects?select=id,name,client_intake_enabled,client_intake_expires_at&client_intake_token=eq.${encodeURIComponent(token)}&limit=1`,
  )
  if (!projectResponse.ok) return json(req, { error: 'Failed to resolve project link' }, 500)

  const projects = await projectResponse.json() as Array<{
    id: string
    name: string
    client_intake_enabled: boolean
    client_intake_expires_at: string
  }>
  const project = projects[0]
  if (!project || !project.client_intake_enabled || new Date(project.client_intake_expires_at).getTime() <= Date.now()) {
    return json(req, { error: 'Project link is invalid or expired' }, 404)
  }

  const requestsResponse = await supabaseFetch(
    `/rest/v1/client_intake_requests?select=task_id,created_at&project_id=eq.${project.id}&order=created_at.desc&limit=200`,
  )
  if (!requestsResponse.ok) return json(req, { error: 'Failed to load client requests' }, 500)

  const requests = await requestsResponse.json() as Array<{ task_id: string; created_at: string }>
  if (requests.length === 0) {
    return json(req, { project: { id: project.id, name: project.name }, requests: [] })
  }

  const taskIds = requests.map((request) => request.task_id).join(',')
  const tasksResponse = await supabaseFetch(
    `/rest/v1/tasks?select=id,title,status,assigned_to,description,created_at,updated_at&id=in.(${encodeURIComponent(taskIds)})`,
  )
  if (!tasksResponse.ok) return json(req, { error: 'Failed to load request statuses' }, 500)

  const tasks = await tasksResponse.json() as Array<{
    id: string
    title: string
    status: string | null
    assigned_to: string | null
    description: string | null
    created_at: string | null
    updated_at: string | null
  }>
  const taskById = new Map(tasks.map((task) => [task.id, task]))

  const assigneeProfilesResponse = await supabaseFetch('/rest/v1/rpc/get_client_intake_assignee_profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_project_id: project.id }),
  })
  const assigneeProfiles = assigneeProfilesResponse.ok
    ? await assigneeProfilesResponse.json() as Array<{ user_id: string; display_name: string }>
    : []
  const assigneeNameByUserId = new Map(assigneeProfiles.map((profile) => [profile.user_id, profile.display_name]))

  return json(req, {
    project: { id: project.id, name: project.name },
    requests: requests.flatMap((request) => {
      const task = taskById.get(request.task_id)
      if (!task) return []
      const details = parseClientRequestDescription(task.description)
      return [{
        id: task.id,
        title: task.title,
        status: task.status,
        created_at: task.created_at,
        updated_at: task.updated_at,
        submitted_at: request.created_at,
        assignee_name: task.assigned_to ? assigneeNameByUserId.get(task.assigned_to) ?? 'Assigned' : null,
        ...details,
      }]
    }),
  })
})