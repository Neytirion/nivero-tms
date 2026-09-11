import { supabase } from '../supabase'

export interface ClientIntakeAttachmentPayload {
  name: string
  mimeType: string
  contentBase64: string
}

export interface SubmitClientIntakeInput {
  token: string
  clientName?: string
  clientEmail?: string
  title?: string
  message: string
  attachments?: ClientIntakeAttachmentPayload[]
}

interface SubmitClientIntakeResponse {
  success: boolean
  taskId: string
}

async function getFunctionErrorMessage(error: { message: string; context?: unknown }) {
  const context = error.context
  if (!context || typeof context !== 'object') {
    return error.message
  }

  const response = context as {
    json?: () => Promise<unknown>
    text?: () => Promise<string>
    clone?: () => { json?: () => Promise<unknown>; text?: () => Promise<string> }
  }
  const jsonResponse = typeof response.clone === 'function' ? response.clone() : response

  if (typeof jsonResponse.json === 'function') {
    try {
      const payload = await jsonResponse.json() as { error?: string; message?: string }
      const message = payload.error ?? payload.message
      if (message?.trim()) {
        return message
      }
    } catch {
      // Fall back to the generic Supabase error message.
    }
  }

  const textResponse = typeof response.clone === 'function' ? response.clone() : response
  if (typeof textResponse.text === 'function') {
    try {
      const message = await textResponse.text()
      if (message.trim()) {
        return message
      }
    } catch {
      // Fall back to the generic Supabase error message.
    }
  }

  return error.message
}

export interface ClientIntakeRequestPreview {
  id: string
  title: string
  status: string | null
  created_at: string | null
  updated_at: string | null
  submitted_at: string
  assignee_name: string | null
  request_details: string
  attachments: Array<{ name: string; url: string; is_image: boolean }>
}

export interface ClientIntakeHistoryResponse {
  project: { id: string; name: string }
  requests: ClientIntakeRequestPreview[]
}

export async function submitClientIntake(input: SubmitClientIntakeInput) {
  const { data, error } = await supabase.functions.invoke<SubmitClientIntakeResponse>('submit-client-intake', {
    body: input,
  })

  if (error) {
    throw new Error(await getFunctionErrorMessage(error))
  }

  if (!data?.success || !data.taskId) {
    throw new Error('Failed to submit client request')
  }

  return data
}

export async function getClientIntakeHistory(token: string) {
  const { data, error } = await supabase.functions.invoke<ClientIntakeHistoryResponse>('list-client-intake-requests', {
    body: { token },
  })

  if (error) {
    throw new Error(await getFunctionErrorMessage(error))
  }

  if (!data?.project || !Array.isArray(data.requests)) {
    throw new Error('Failed to load client request history')
  }

  return data
}
