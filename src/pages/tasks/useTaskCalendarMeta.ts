import { useMemo } from 'react'
import type { TaskPreview } from '../../lib/pm'
import { buildCalendarMeta, shiftMonthValue } from '../tasks-page.utils'

interface UseTaskCalendarMetaInput {
  calendarMonth: string
  tasks: TaskPreview[]
}

export function useTaskCalendarMeta(input: UseTaskCalendarMetaInput) {
  const calendarMeta = useMemo(() => {
    return buildCalendarMeta(input.calendarMonth, input.tasks)
  }, [input.calendarMonth, input.tasks])

  return {
    calendarMeta,
    shiftCalendarMonthValue: shiftMonthValue,
  }
}
