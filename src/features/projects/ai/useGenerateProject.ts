/**
 * Hook for generating projects from text using AI
 */

import { useState } from 'react'
import type { AiProjectDraft, GenerateProjectResponse } from '../../../lib/ai'

interface UseGenerateProjectState {
  isLoading: boolean
  error: string | null
  preview: AiProjectDraft | null
  validationErrors: Record<string, string[]> | null
}

export function useGenerateProject() {
  const [state, setState] = useState<UseGenerateProjectState>({
    isLoading: false,
    error: null,
    preview: null,
    validationErrors: null,
  })

  const generate = async (text: string) => {
    if (!text.trim()) {
      setState((prev) => ({
        ...prev,
        error: 'Please enter project description',
      }))
      return
    }

    setState({
      isLoading: true,
      error: null,
      preview: null,
      validationErrors: null,
    })

    try {
      // Call Edge Function to generate project draft
      const response = await fetch('/api/ai/generate-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim() }),
      })

      const data: GenerateProjectResponse = await response.json()

      if (!response.ok || !data.success) {
        setState({
          isLoading: false,
          error: data.error || 'Failed to generate project',
          preview: null,
          validationErrors: data.validation_errors || null,
        })
        return
      }

      setState({
        isLoading: false,
        error: null,
        preview: data.draft || null,
        validationErrors: null,
      })
    } catch (error) {
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
        preview: null,
        validationErrors: null,
      })
    }
  }

  const reset = () => {
    setState({
      isLoading: false,
      error: null,
      preview: null,
      validationErrors: null,
    })
  }

  return {
    ...state,
    generate,
    reset,
  }
}
