declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const SLACK_API_URL = 'https://slack.com/api'
const REQUEST_TIMEOUT_MS = 15_000
const MAX_MESSAGE_LENGTH = 3_000
const PILOT_RECIPIENT_EMAIL = 'danylo@nivero.no'

type SlackApiResponse = {
  ok: boolean
  error?: string
  user?: { id?: string }
  channel?: { id?: string }
  ts?: string
}

type NotifyRequest = {
  email?: string
  text?: string
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin')

  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    Vary: 'Origin',
  }
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json',
    },
  })
}

function getRequiredSecret(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) {
    throw new Error(`Missing required server configuration: ${name}`)
  }

  return value
}

async function callSlack(token: string, method: string, body: Record<string, string>): Promise<SlackApiResponse> {
  const response = await fetch(`${SLACK_API_URL}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Slack ${method} request failed with status ${response.status}`)
  }

  const data = await response.json() as SlackApiResponse
  if (!data.ok) {
    throw new Error(`Slack ${method} request failed: ${data.error ?? 'unknown error'}`)
  }

  return data
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(request) })
  }

  if (request.method !== 'POST') {
    return json(request, { success: false, error: 'Method not allowed' }, 405)
  }

  let payload: NotifyRequest
  try {
    payload = await request.json()
  } catch {
    return json(request, { success: false, error: 'Invalid JSON payload' }, 400)
  }

  const email = payload.email?.trim().toLowerCase() ?? ''
  const text = payload.text?.trim() ?? ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(request, { success: false, error: 'A valid recipient email is required' }, 400)
  }

  if (email !== PILOT_RECIPIENT_EMAIL) {
    return json(request, { success: false, error: 'Slack notifications are limited to the pilot recipient' }, 403)
  }

  if (!text || text.length > MAX_MESSAGE_LENGTH) {
    return json(request, { success: false, error: `Message is required and must be at most ${MAX_MESSAGE_LENGTH} characters` }, 400)
  }

  try {
    const token = getRequiredSecret('SLACK_BOT_TOKEN')
    const userLookup = await callSlack(token, 'users.lookupByEmail', { email })
    const userId = userLookup.user?.id

    if (!userId) {
      throw new Error('Slack did not return a user ID for the recipient')
    }

    const directMessage = await callSlack(token, 'conversations.open', { users: userId })
    const channelId = directMessage.channel?.id

    if (!channelId) {
      throw new Error('Slack did not return a direct message channel')
    }

    const message = await callSlack(token, 'chat.postMessage', { channel: channelId, text })

    return json(request, { success: true, messageTimestamp: message.ts ?? null })
  } catch (error) {
    console.error('Slack notification failed', error)
    return json(
      request,
      { success: false, error: error instanceof Error ? error.message : 'Slack notification failed' },
      502,
    )
  }
})