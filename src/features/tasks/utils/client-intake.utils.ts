export type ParsedAttachment = {
  name: string
  url: string
  isImage: boolean
}

export type ParsedClientIntakePayload = {
  clientName: string | null
  clientEmail: string | null
  requestDetails: string
  attachments: ParsedAttachment[]
  internalDescription: string
}

function normalizeAttachmentUrl(value: string) {
  return value.trim().replace(/[),.;]+$/g, '')
}

function isImageAttachmentUrl(url: string) {
  const normalized = url.split('?')[0].toLowerCase()
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)$/.test(normalized)
}

export function parseAttachmentLine(line: string): { name: string; url: string } | null {
  const namedPattern = /^\s*(?:\d+\.\s*)?(.+?)\s*\|\s*(https?:\/\/\S+)\s*$/i
  const namedMatch = line.match(namedPattern)
  if (namedMatch) {
    const name = namedMatch[1].trim()
    const url = normalizeAttachmentUrl(namedMatch[2])
    if (url) {
      return { name: name.length > 0 ? name : 'Attachment', url }
    }
  }

  const legacyPattern = /^\s*(?:\d+\.\s*)?(https?:\/\/\S+)\s*$/i
  const legacyMatch = line.match(legacyPattern)
  if (legacyMatch) {
    const url = normalizeAttachmentUrl(legacyMatch[1])
    if (url) {
      return { name: 'Attachment', url }
    }
  }

  return null
}

export function extractClientAttachments(description: string | null | undefined): ParsedAttachment[] {
  if (!description) return []

  const lines = description.split('\n')
  const attachments: ParsedAttachment[] = []
  let inAttachmentsSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (/^attachments:?$/i.test(trimmed)) {
      inAttachmentsSection = true
      continue
    }

    if (!inAttachmentsSection) continue
    if (trimmed.length === 0) continue

    const parsed = parseAttachmentLine(trimmed)
    if (!parsed) {
      inAttachmentsSection = false
      continue
    }

    attachments.push({ name: parsed.name, url: parsed.url, isImage: isImageAttachmentUrl(parsed.url) })
  }

  const uniqueByUrl = new Map<string, ParsedAttachment>()
  for (const item of attachments) uniqueByUrl.set(item.url, item)
  return Array.from(uniqueByUrl.values())
}

export function parseClientIntakePayload(description: string | null | undefined): ParsedClientIntakePayload | null {
  if (!description) return null

  const normalized = description.replace(/\r\n/g, '\n')
  if (!/^\s*Client request submitted via public intake link\./i.test(normalized)) return null

  const clientNameMatch = normalized.match(/^Client name:\s*(.+)$/im)
  const clientEmailMatch = normalized.match(/^Client email:\s*(.+)$/im)
  const detailsMatch = normalized.match(/Request details:\s*\n([\s\S]*?)(?:\n\s*Attachments:\s*\n|\n\s*Internal description:\s*\n|$)/i)
  const attachmentsMatch = normalized.match(/\n\s*Attachments:\s*\n([\s\S]*?)(?:\n\s*Internal description:\s*\n|$)/i)
  const internalDescriptionMatch = normalized.match(/\n\s*Internal description:\s*\n([\s\S]*)$/i)

  const rawClientName = (clientNameMatch?.[1] ?? '').trim()
  const rawClientEmail = (clientEmailMatch?.[1] ?? '').trim()
  const requestDetails = (detailsMatch?.[1] ?? '').trim()
  const attachmentsSection = attachmentsMatch?.[1] ?? ''
  const internalDescription = (internalDescriptionMatch?.[1] ?? '').trim()

  const attachments: ParsedAttachment[] = []
  for (const line of attachmentsSection.split('\n')) {
    const parsed = parseAttachmentLine(line.trim())
    if (parsed) {
      attachments.push({ name: parsed.name, url: parsed.url, isImage: isImageAttachmentUrl(parsed.url) })
    }
  }

  const uniqueByUrl = new Map<string, ParsedAttachment>()
  for (const attachment of attachments) uniqueByUrl.set(attachment.url, attachment)

  return {
    clientName: rawClientName.toLowerCase() === 'not provided' || rawClientName.length === 0 ? null : rawClientName,
    clientEmail: rawClientEmail.toLowerCase() === 'not provided' || rawClientEmail.length === 0 ? null : rawClientEmail,
    requestDetails,
    attachments: Array.from(uniqueByUrl.values()),
    internalDescription,
  }
}

export function formatClientIntakePayload(input: ParsedClientIntakePayload): string {
  const lines: string[] = [
    'Client request submitted via public intake link.',
    '',
    `Client name: ${input.clientName?.trim() || 'Not provided'}`,
    `Client email: ${input.clientEmail?.trim() || 'Not provided'}`,
    '',
    'Request details:',
    input.requestDetails.trim() || 'Not provided',
  ]

  if (input.attachments.length > 0) {
    lines.push('', 'Attachments:')
    for (const [index, attachment] of input.attachments.entries()) {
      lines.push(`${index + 1}. ${attachment.name?.trim() || `Attachment ${index + 1}`} | ${attachment.url}`)
    }
  }

  if (input.internalDescription.trim().length > 0) {
    lines.push('', 'Internal description:', input.internalDescription.trim())
  }

  return lines.join('\n')
}

export function stripAttachmentSection(description: string | null | undefined): string {
  if (!description) return ''

  const lines = description.split('\n')
  const kept: string[] = []
  let inAttachmentsSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (/^attachments:?$/i.test(trimmed)) {
      inAttachmentsSection = true
      continue
    }

    if (!inAttachmentsSection) {
      kept.push(line)
      continue
    }

    if (trimmed.length === 0) continue

    const parsed = parseAttachmentLine(trimmed)
    if (parsed) continue

    inAttachmentsSection = false
    kept.push(line)
  }

  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
