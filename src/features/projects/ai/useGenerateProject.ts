/**
 * Hook for generating projects from text using AI
 */

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
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

    if (text.trim().length < 10) {
      setState((prev) => ({
        ...prev,
        error: 'Please provide at least 10 characters',
      }))
      return
    }

    if (text.trim().length > 10000) {
      setState((prev) => ({
        ...prev,
        error: 'Description is too long (max 10,000 characters)',
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
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('generate-project-draft', {
        body: { text: text.trim() },
      })

      if (error) {
        setState({
          isLoading: false,
          error: error.message || 'Failed to generate project',
          preview: null,
          validationErrors: null,
        })
        return
      }

      const result = data as GenerateProjectResponse

      if (!result.success) {
        setState({
          isLoading: false,
          error: result.error || 'Failed to generate project',
          preview: null,
          validationErrors: result.validation_errors || null,
        })
        return
      }

      setState({
        isLoading: false,
        error: null,
        preview: result.draft || null,
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
