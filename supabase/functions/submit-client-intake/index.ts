export {}

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const MAX_MESSAGE_LENGTH = 1000
const MAX_CLIENT_NAME_LENGTH = 50
const MAX_CLIENT_EMAIL_LENGTH = 50
const MAX_ATTACHMENTS = 10
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const GENERATED_TITLE_MAX_LENGTH = 120

function isLikelyEmail(value: string): boolean {
  if (value.length === 0) {
    return true
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin')

  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    Vary: 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/json',
    },
  })
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes.buffer
}

interface AttachmentInput {
  name: string
  mimeType: string
  contentBase64: string
}

interface IntakePayload {
  token: string
  clientName?: string
  clientEmail?: string
  message: string
  attachments?: AttachmentInput[]
}

function buildGeneratedTaskTitle(clientName: string, clientEmail: string): string {
  const sender = clientName || clientEmail || 'Unknown sender'
  const baseTitle = `Client request from ${sender}`

  if (baseTitle.length <= GENERATED_TITLE_MAX_LENGTH) {
    return baseTitle
  }

  return `${baseTitle.slice(0, GENERATED_TITLE_MAX_LENGTH - 1)}…`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return json(req, { success: false, error: 'Method not allowed' }, 405)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, { success: false, error: 'Missing Supabase environment variables' }, 500)
  }

  let payload: IntakePayload

  try {
    payload = await req.json()
  } catch {
    return json(req, { success: false, error: 'Invalid JSON payload' }, 400)
  }

  const token = payload.token?.trim() ?? ''
  const clientName = payload.clientName?.trim() ?? ''
  const clientEmail = payload.clientEmail?.trim() ?? ''
  const message = payload.message?.trim() ?? ''
  const attachments = payload.attachments ?? []

  if (!isUuid(token)) {
    return json(req, { success: false, error: 'Invalid project link token' }, 400)
  }

  if (message.length === 0 || message.length > MAX_MESSAGE_LENGTH) {
    return json(req, { success: false, error: `Details is required and must be at most ${MAX_MESSAGE_LENGTH} characters` }, 400)
  }

  if (clientName.length > MAX_CLIENT_NAME_LENGTH) {
    return json(req, { success: false, error: `Client name must be at most ${MAX_CLIENT_NAME_LENGTH} characters` }, 400)
  }

  if (clientEmail.length > MAX_CLIENT_EMAIL_LENGTH) {
    return json(req, { success: false, error: `Client email must be at most ${MAX_CLIENT_EMAIL_LENGTH} characters` }, 400)
  }

  if (!isLikelyEmail(clientEmail)) {
    return json(req, { success: false, error: 'Client email format is invalid' }, 400)
  }

  if (attachments.length > MAX_ATTACHMENTS) {
    return json(req, { success: false, error: `You can upload up to ${MAX_ATTACHMENTS} files` }, 400)
  }

  const projectLookupUrl = `${SUPABASE_URL}/rest/v1/projects?select=id,name,owner_id,project_manager_id&client_intake_token=eq.${encodeURIComponent(token)}&limit=1`

  const projectLookupResponse = await fetch(projectLookupUrl, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (!projectLookupResponse.ok) {
    return json(req, { success: false, error: 'Failed to resolve project by link token' }, 500)
  }

  const projects = (await projectLookupResponse.json()) as Array<{ id: string; name: string; owner_id: string | null; project_manager_id: string | null }>
  const project = projects[0]

  if (!project) {
    return json(req, { success: false, error: 'Project link is invalid or expired' }, 404)
  }

  const createdByUserId = project.project_manager_id ?? project.owner_id

  if (!createdByUserId) {
    return json(req, { success: false, error: 'Project has no responsible manager/owner for task creation' }, 400)
  }

  const attachmentPublicEntries: Array<{ name: string; url: string }> = []

  for (const attachment of attachments) {
    const fileName = attachment.name?.trim() ?? ''
    const contentBase64 = attachment.contentBase64?.trim() ?? ''

    if (!fileName) {
      return json(req, { success: false, error: 'Attachment name is required' }, 400)
    }

    if (!contentBase64) {
      return json(req, { success: false, error: `Attachment ${fileName} has empty content` }, 400)
    }

    let arrayBuffer: ArrayBuffer
    try {
      arrayBuffer = base64ToArrayBuffer(contentBase64)
    } catch {
      return json(req, { success: false, error: `Attachment ${fileName} content is invalid` }, 400)
    }

    if (arrayBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
      return json(req, { success: false, error: `Attachment ${fileName} exceeds 5MB` }, 400)
    }

    const extension = safeFileName(fileName || 'attachment')
    const path = `${project.id}/${Date.now()}-${crypto.randomUUID()}-${extension}`
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/client-intake-images/${encodeURIComponent(path)}`

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: arrayBuffer,
    })

    if (!uploadResponse.ok) {
      return json(req, { success: false, error: `Failed to upload attachment ${fileName}` }, 500)
    }

    attachmentPublicEntries.push({
      name: fileName,
      url: `${SUPABASE_URL}/storage/v1/object/public/client-intake-images/${path}`,
    })
  }

  const descriptionParts: string[] = [
    'Client request submitted via public intake link.',
    '',
    clientName ? `Client name: ${clientName}` : 'Client name: not provided',
    clientEmail ? `Client email: ${clientEmail}` : 'Client email: not provided',
    '',
    'Request details:',
    message,
  ]

  if (attachmentPublicEntries.length > 0) {
    descriptionParts.push('', 'Attachments:')
    for (const [index, attachment] of attachmentPublicEntries.entries()) {
      descriptionParts.push(`${index + 1}. ${attachment.name} | ${attachment.url}`)
    }
  }

  const generatedTitle = buildGeneratedTaskTitle(clientName, clientEmail)

  const taskInsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      project_id: project.id,
      title: generatedTitle,
      description: descriptionParts.join('\n'),
      status: 'todo',
      priority: 'medium',
      assigned_to: null,
      created_by: createdByUserId,
      estimate_hours: null,
      actual_hours: 0,
      work_package_id: null,
      blocked_by_task_id: null,
      due_date: null,
    }),
  })

  if (!taskInsertResponse.ok) {
    const body = await taskInsertResponse.text()
    return json(req, { success: false, error: `Failed to create task: ${body}` }, 500)
  }

  const createdTasks = (await taskInsertResponse.json()) as Array<{ id: string }>
  const createdTask = createdTasks[0]

  if (!createdTask?.id) {
    return json(req, { success: false, error: 'Task created without ID' }, 500)
  }

  return json(req, { success: true, taskId: createdTask.id })
})
