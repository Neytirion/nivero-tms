import { describe, expect, it } from 'vitest'
import { isExecutionTaskStatus, isTaskClosedStatus, toCanonicalTaskStatus } from './task-status'

describe('task-status', () => {
  it('normalizes synonyms to canonical task statuses', () => {
    expect(toCanonicalTaskStatus('new')).toBe('todo')
    expect(toCanonicalTaskStatus('doing')).toBe('in_progress')
    expect(toCanonicalTaskStatus('qa')).toBe('review')
    expect(toCanonicalTaskStatus('closed')).toBe('done')
  })

  it('detects closed statuses', () => {
    expect(isTaskClosedStatus('done')).toBe(true)
    expect(isTaskClosedStatus('completed')).toBe(true)
    expect(isTaskClosedStatus('todo')).toBe(false)
  })

  it('marks only execution pipeline states as execution states', () => {
    expect(isExecutionTaskStatus('in progress')).toBe(true)
    expect(isExecutionTaskStatus('review')).toBe(true)
    expect(isExecutionTaskStatus('done')).toBe(true)
    expect(isExecutionTaskStatus('backlog')).toBe(false)
  })
})
