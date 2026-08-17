import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { MentionsPage } from './MentionsPage'
import { getUserMentions, markMentionAsRead, type UserMentionPreview } from '../../lib/pm'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/pm', () => ({
  getUserMentions: vi.fn(),
  markMentionAsRead: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

const mockGetUserMentions = vi.mocked(getUserMentions)
const mockMarkMentionAsRead = vi.mocked(markMentionAsRead)

type SupabaseLike = {
  auth: { getUser: ReturnType<typeof vi.fn> }
  from: ReturnType<typeof vi.fn>
}

const mockSupabase = supabase as unknown as SupabaseLike

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderMentionsPage(initialPath = '/app/mentions') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/app/mentions"
          element={
            <>
              <MentionsPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/app/tasks/:taskId" element={<LocationProbe />} />
        <Route path="/app/projects/:projectId" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

function createMentionPreview(overrides: Partial<UserMentionPreview> = {}): UserMentionPreview {
  return {
    mention: {
      id: 'm1',
      project_id: 'p1',
      comment_id: 'c1',
      task_id: 't1',
      mentioned_user_id: 'u1',
      mentioned_by_user_id: 'u2',
      created_at: '2026-08-17T10:00:00.000Z',
      read_at: null,
    },
    comment: {
      id: 'c1',
      project_id: 'p1',
      task_id: 't1',
      user_id: 'u2',
      message: 'Please check this update',
      created_at: '2026-08-17T09:59:00.000Z',
    },
    project: {
      id: 'p1',
      name: 'Apollo',
    },
    taskTitle: 'Implement login',
    ...overrides,
  }
}

describe('MentionsPage', () => {
  beforeEach(() => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'u1' },
      },
    })
    mockSupabase.from.mockReset()
    mockGetUserMentions.mockResolvedValue([createMentionPreview()])
    mockMarkMentionAsRead.mockResolvedValue(true)
  })

  it('loads mentions and toggles unread filter', async () => {
    renderMentionsPage()

    await waitFor(() => {
      expect(mockGetUserMentions).toHaveBeenCalledWith('u1', 200)
    })

    expect(screen.getByText('Please check this update')).toBeInTheDocument()
    expect(screen.getByText('Unread')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))

    expect(screen.getByRole('button', { name: 'Show unread only' })).toBeInTheDocument()
  })

  it('marks a single mention as read', async () => {
    renderMentionsPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark read' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))

    await waitFor(() => {
      expect(mockMarkMentionAsRead).toHaveBeenCalledWith({ mentionId: 'm1', userId: 'u1' })
      expect(screen.queryByRole('button', { name: 'Mark read' })).toBeNull()
    })
  })

  it('opens task details when mention references an existing task', async () => {
    mockSupabase.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === 'comments') {
              return {
                data: { id: 'c1', project_id: 'p1', task_id: 't1' },
                error: null,
              }
            }

            if (table === 'tasks') {
              return {
                data: { id: 't1' },
                error: null,
              }
            }

            return { data: null, error: null }
          },
        }),
      }),
    }))

    renderMentionsPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/app/tasks/t1')
    })
  })

  it('removes broken mention when comment no longer exists', async () => {
    mockSupabase.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === 'comments') {
              return {
                data: null,
                error: null,
              }
            }

            return { data: null, error: null }
          },
        }),
      }),
    }))

    renderMentionsPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))

    await waitFor(() => {
      expect(screen.getByText('This mention points to a deleted message and was removed from the list.')).toBeInTheDocument()
      expect(screen.queryByText('Please check this update')).toBeNull()
    })
  })
})
