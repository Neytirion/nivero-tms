/**
 * Supabase Edge Function: Generate project draft from text using OpenAI
 * 
 * This function:
 * 1. Receives text input from the user
 * 2. Calls OpenAI to generate structured project data
 * 3. Validates the output
 * 4. Returns a draft ready for preview and confirmation
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MAX_INPUT_LENGTH = 10000
const MIN_INPUT_LENGTH = 10
const REQUEST_TIMEOUT_MS = 30000

interface ValidationError {
  [key: string]: string[]
}

/**
 * Validate AI project draft structure without external dependencies
 */
function validateProjectDraft(data: unknown): { valid: boolean; errors?: ValidationError } {
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: { _general: ['Expected object'] } }
  }

  const obj = data as Record<string, unknown>
  const errors: ValidationError = {}

  // Validate project
  if (!obj.project || typeof obj.project !== 'object') {
    errors.project = ['Project is required and must be an object']
  } else {
    const project = obj.project as Record<string, unknown>
    if (!project.name || typeof project.name !== 'string' || project.name.length < 3 || project.name.length > 255) {
      errors['project.name'] = ['Name must be 3-255 characters']
    }
    if (typeof project.estimated_hours !== 'number' || project.estimated_hours < 0) {
      errors['project.estimated_hours'] = ['Must be a non-negative number']
    }
  }

  // Validate estimates
  if (!obj.estimates || typeof obj.estimates !== 'object') {
    errors.estimates = ['Estimates is required and must be an object']
  } else {
    const estimates = obj.estimates as Record<string, unknown>
    if (!Array.isArray(estimates.work_packages) || estimates.work_packages.length === 0) {
      errors['estimates.work_packages'] = ['At least one work package is required']
    } else {
      const workPackages = estimates.work_packages as unknown[]
      for (let i = 0; i < workPackages.length; i++) {
        const pkg = workPackages[i]
        if (!pkg || typeof pkg !== 'object') {
          errors[`work_package_${i}`] = ['Must be an object']
          continue
        }
        const pkgObj = pkg as Record<string, unknown>
        if (!pkgObj.name || typeof pkgObj.name !== 'string' || pkgObj.name.length < 3) {
          errors[`work_package_${i}.name`] = ['Name must be at least 3 characters']
        }
        if (typeof pkgObj.estimated_hours !== 'number' || pkgObj.estimated_hours < 0) {
          errors[`work_package_${i}.estimated_hours`] = ['Must be a non-negative number']
        }
        if (!Array.isArray(pkgObj.tasks) || pkgObj.tasks.length === 0) {
          errors[`work_package_${i}.tasks`] = ['At least one task is required']
        } else {
          const tasks = pkgObj.tasks as unknown[]
          for (let j = 0; j < tasks.length; j++) {
            const task = tasks[j]
            if (!task || typeof task !== 'object') {
              errors[`task_${i}_${j}`] = ['Must be an object']
              continue
            }
            const taskObj = task as Record<string, unknown>
            if (!taskObj.title || typeof taskObj.title !== 'string' || taskObj.title.length < 3) {
              errors[`task_${i}_${j}.title`] = ['Title must be at least 3 characters']
            }
            if (typeof taskObj.estimate_hours !== 'number' || taskObj.estimate_hours < 0) {
              errors[`task_${i}_${j}.estimate_hours`] = ['Must be a non-negative number']
            }
            if (!taskObj.priority || !['low', 'medium', 'high'].includes(taskObj.priority as string)) {
              errors[`task_${i}_${j}.priority`] = ['Must be one of: low, medium, high']
            }
          }
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors }
  }

  return { valid: true }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse input
    const { text } = await req.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Text input is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const trimmedText = text.trim()

    if (trimmedText.length < MIN_INPUT_LENGTH) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Project description must be at least ${MIN_INPUT_LENGTH} characters`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (trimmedText.length > MAX_INPUT_LENGTH) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Project description must not exceed ${MAX_INPUT_LENGTH} characters`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenAI API key not configured',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Call OpenAI
    const prompt = `
You are a project management assistant. Based on the user's description, generate a structured project plan.

Return ONLY valid JSON (no markdown, no extra text) matching this exact structure:
{
  "project": {
    "name": "string (project name, max 255 chars)",
    "description": "string (optional, project description)",
    "customer_name": "string (optional, customer name)",
    "start_date": "string (optional, ISO date YYYY-MM-DD)",
    "end_date": "string (optional, ISO date YYYY-MM-DD)",
    "budget_amount": "number (optional, budget in currency units)",
    "estimated_hours": "number (total estimated hours for entire project)"
  },
  "estimates": {
    "version_number": 1,
    "work_packages": [
      {
        "name": "string (work package name)",
        "estimated_hours": "number (hours for this package)",
        "tasks": [
          {
            "title": "string (task name, max 255 chars)",
            "description": "string (optional)",
            "priority": "string (one of: low, medium, high)",
            "estimate_hours": "number (hours for this task)",
            "status": "string (one of: todo, backlog)"
          }
        ]
      }
    ]
  }
}

User input: "${trimmedText.replace(/"/g, '\\"')}"

Requirements:
- Generate realistic project breakdown
- Ensure sum of task hours ≈ work package hours
- Ensure sum of work package hours ≈ project estimated_hours
- Use reasonable priorities (mostly medium, some high/low)
- Create 3-8 work packages with 5-15 tasks each
- Return ONLY the JSON object, nothing else
`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let openaiResponse
    try {
      openaiResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request timed out. Please try again with a shorter description.',
          }),
          {
            status: 504,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      throw fetchError
    }
    clearTimeout(timeoutId)

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json()
      return new Response(
        JSON.stringify({
          success: false,
          error: `OpenAI error: ${error.error?.message || 'Unknown error'}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content

    if (!content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No response from OpenAI',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse and validate JSON
    let draftData
    try {
      draftData = JSON.parse(content)
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON returned from AI model',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate against schema
    const validation = validateProjectDraft(draftData)

    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Generated project does not meet validation requirements',
          validation_errors: validation.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        draft: draftData,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error in generate-project:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
