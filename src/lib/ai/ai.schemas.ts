/**
 * Zod schemas for AI-generated project validation
 */

import { z } from 'zod'

export const AiTaskSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters').max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimate_hours: z.number().min(0).max(1000),
  status: z.enum(['todo', 'backlog']).default('todo'),
})

export const AiWorkPackageSchema = z.object({
  name: z.string().min(3, 'Work package name must be at least 3 characters').max(255),
  estimated_hours: z.number().min(0).max(10000),
  tasks: z.array(AiTaskSchema).min(1, 'At least one task is required'),
})

export const AiProjectDraftSchema = z.object({
  project: z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters').max(255),
    description: z.string().optional(),
    customer_name: z.string().optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    budget_amount: z.number().min(0).optional(),
    estimated_hours: z.number().min(0),
  }),
  estimates: z.object({
    version_number: z.number().default(1),
    work_packages: z.array(AiWorkPackageSchema).min(1, 'At least one work package is required'),
  }),
})

// Infer TypeScript types from schemas
export type ValidatedAiProjectDraft = z.infer<typeof AiProjectDraftSchema>
export type ValidatedAiWorkPackage = z.infer<typeof AiWorkPackageSchema>
export type ValidatedAiTask = z.infer<typeof AiTaskSchema>

/**
 * Validate AI project draft
 */
export function validateAiProjectDraft(data: unknown) {
  try {
    const validated = AiProjectDraftSchema.parse(data)
    return { valid: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.flatten().fieldErrors
      return { valid: false, errors }
    }
    return { valid: false, errors: { _general: ['Validation failed'] } }
  }
}
