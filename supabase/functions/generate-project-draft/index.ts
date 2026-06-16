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
import { validateAiProjectDraft } from '../../../src/lib/ai/ai.schemas.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

User input: "${text.replace(/"/g, '\\"')}"

Requirements:
- Generate realistic project breakdown
- Ensure sum of task hours ≈ work package hours
- Ensure sum of work package hours ≈ project estimated_hours
- Use reasonable priorities (mostly medium, some high/low)
- Create 3-8 work packages with 5-15 tasks each
- Return ONLY the JSON object, nothing else
`

    const openaiResponse = await fetch(OPENAI_API_URL, {
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
    })

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
    const validation = validateAiProjectDraft(draftData)

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
        draft: validation.data,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
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
