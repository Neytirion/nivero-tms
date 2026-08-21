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
  title: string
  message: string
  attachments?: ClientIntakeAttachmentPayload[]
}

interface SubmitClientIntakeResponse {
  success: boolean
  taskId: string
}

export async function submitClientIntake(input: SubmitClientIntakeInput) {
  const { data, error } = await supabase.functions.invoke<SubmitClientIntakeResponse>('submit-client-intake', {
    body: input,
  })

  if (error) {
    const response = (error as { context?: Response }).context

    if (response) {
      const responseClone = response.clone()
      let parsedMessage = ''

      try {
        const payload = (await response.json()) as { error?: string; message?: string }
        parsedMessage = payload.error ?? payload.message ?? ''
      } catch {
        // Ignore JSON parse errors; we'll try plain text below.
      }

      if (parsedMessage.trim().length > 0) {
        throw new Error(parsedMessage)
      }

      let responseText = ''
      try {
        responseText = await responseClone.text()
      } catch {
        // Fall through to generic message.
      }

      if (responseText.trim().length > 0) {
        throw new Error(responseText)
      }
    }

    throw new Error(error.message)
  }

  if (!data?.success || !data.taskId) {
    throw new Error('Failed to submit client request')
  }

  return data
}
