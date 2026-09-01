declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const DEMO_TOKEN_URL = 'https://goapi.poweroffice.net/Demo/OAuth/Token'
const PRODUCTION_TOKEN_URL = 'https://goapi.poweroffice.net/OAuth/Token'
const REQUEST_TIMEOUT_MS = 15_000

type PowerOfficeEnvironment = 'demo' | 'production'

type TokenResponse = {
  access_token?: string
  expires_in?: number
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getRequiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim()
  if (!value) {
    throw new Error(`Missing required server configuration: ${name}`)
  }

  return value
}

function getEnvironment(): PowerOfficeEnvironment {
  const value = Deno.env.get('POWER_OFFICE_ENV')?.trim().toLowerCase() ?? 'demo'
  if (value === 'demo' || value === 'production') {
    return value
  }

  throw new Error('POWER_OFFICE_ENV must be either "demo" or "production"')
}

async function requestAccessToken() {
  const environment = getEnvironment()
  const applicationKey = getRequiredSecret('POWER_OFFICE_APPLICATION_KEY')
  const clientKey = getRequiredSecret('POWER_OFFICE_CLIENT_KEY')
  const subscriptionKey = getRequiredSecret('POWER_OFFICE_SUBSCRIPTION_KEY')
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const tokenUrl = environment === 'demo' ? DEMO_TOKEN_URL : PRODUCTION_TOKEN_URL
  const authorization = btoa(`${applicationKey}:${clientKey}`)

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authorization}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: timeout,
  })

  if (!response.ok) {
    const responseText = await response.text()
    console.error('PowerOffice token request failed', { status: response.status, responseText })
    throw new Error(`PowerOffice authentication failed with status ${response.status}`)
  }

  const token = await response.json() as TokenResponse
  if (!token.access_token) {
    throw new Error('PowerOffice token response did not include an access token')
  }

  return { environment, expiresIn: token.expires_in ?? null }
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const result = await requestAccessToken()
    return jsonResponse({ connected: true, ...result })
  } catch (error) {
    console.error('PowerOffice connection check failed', error)
    return jsonResponse(
      { connected: false, error: error instanceof Error ? error.message : 'PowerOffice connection check failed' },
      502,
    )
  }
})
