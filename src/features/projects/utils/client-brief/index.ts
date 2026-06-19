import type { BuildClientBriefInput, ClientBriefExportFormat } from './types'
import { downloadClientBriefDocx } from './docx'
import { buildClientBriefHtml, downloadClientBriefHtml } from './html'
import { downloadClientBriefPdf } from './pdf'
import { loadEstimateModules } from './view-model'

export type {
  BuildClientBriefInput,
  ClientBriefExportFormat,
  ClientBriefTheme,
} from './types'
export {
  buildClientBriefHtml,
  downloadClientBriefDocx,
  downloadClientBriefHtml,
  downloadClientBriefPdf,
}

export async function downloadClientBrief(
  input: BuildClientBriefInput,
  format: ClientBriefExportFormat,
) {
  const estimateModules = await loadEstimateModules(input.project.id)

  const exportInput: BuildClientBriefInput = {
    ...input,
    estimateModules,
  }

  if (format === 'html') {
    return downloadClientBriefHtml(exportInput)
  }

  if (format === 'pdf') {
    return downloadClientBriefPdf(exportInput)
  }

  return downloadClientBriefDocx(exportInput)
}
