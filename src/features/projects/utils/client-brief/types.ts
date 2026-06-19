import type { ProjectPreview, TaskPreview } from '../../../../lib/pm'

export interface ClientBriefTheme {
  brandName: string
  primaryColor: string
  accentColor: string
  surfaceColor: string
  textColor: string
  mutedTextColor: string
}

export interface BuildClientBriefInput {
  project: ProjectPreview
  tasks: TaskPreview[]
  estimateModules?: Array<{
    name: string
    estimated_hours: number | null
  }>
  teamMemberNames: string[]
  projectManagerName?: string
  generatedAt?: Date
  theme?: ClientBriefTheme
}

export interface BriefViewModel {
  theme: ClientBriefTheme
  generatedAt: Date
  projectName: string
  customer: string
  managerName: string
  progress: number
  risk: string
  includeExecutionHealth: boolean
  estimateModules: Array<{
    name: string
    estimated_hours: number | null
  }>
  description: string
}

export type ClientBriefExportFormat = 'html' | 'pdf' | 'docx'
