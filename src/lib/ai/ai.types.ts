/**
 * AI-generated project draft types
 */

export interface AiTask {
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  estimate_hours: number
  status?: 'todo' | 'backlog'
}

export interface AiWorkPackage {
  name: string
  estimated_hours: number
  tasks: AiTask[]
}

export interface AiProjectDraft {
  project: {
    name: string
    description?: string
    customer_name?: string
    start_date?: string
    end_date?: string
    budget_amount?: number
    estimated_hours: number
  }
  estimates: {
    version_number: number
    work_packages: AiWorkPackage[]
  }
}

export interface GenerateProjectInput {
  text: string
}

export interface GenerateProjectResponse {
  success: boolean
  draft?: AiProjectDraft
  error?: string
  validation_errors?: Record<string, string[]>
}
