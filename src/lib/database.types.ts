export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string | null
          customer_name: string | null
          project_manager_id: string | null
          start_date: string | null
          end_date: string | null
          estimated_hours: number | null
          actual_hours: number | null
          progress_percent: number | null
          budget_amount: number | null
          risk_status: string | null
          status: string | null
          completed_at: string | null
          deadline_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id?: string | null
          customer_name?: string | null
          project_manager_id?: string | null
          start_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          progress_percent?: number | null
          budget_amount?: number | null
          risk_status?: string | null
          status?: string | null
          completed_at?: string | null
          deadline_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string | null
          customer_name?: string | null
          project_manager_id?: string | null
          start_date?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          progress_percent?: number | null
          budget_amount?: number | null
          risk_status?: string | null
          status?: string | null
          completed_at?: string | null
          deadline_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'projects_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      estimates: {
        Row: {
          id: string
          project_id: string
          version_number: number
          status: string
          created_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_number: number
          status?: string
          created_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version_number?: number
          status?: string
          created_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'estimates_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estimates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      work_packages: {
        Row: {
          id: string
          estimate_id: string
          name: string
          estimated_hours: number
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          estimate_id: string
          name: string
          estimated_hours: number
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          estimate_id?: string
          name?: string
          estimated_hours?: number
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'work_packages_estimate_id_fkey'
            columns: ['estimate_id']
            isOneToOne: false
            referencedRelation: 'estimates'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          task_id?: string | null
          user_id?: string
          message?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      comment_mentions: {
        Row: {
          id: string
          project_id: string
          comment_id: string
          task_id: string | null
          mentioned_user_id: string
          mentioned_by_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          comment_id: string
          task_id?: string | null
          mentioned_user_id: string
          mentioned_by_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          comment_id?: string
          task_id?: string | null
          mentioned_user_id?: string
          mentioned_by_user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comment_mentions_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comment_mentions_comment_id_fkey'
            columns: ['comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comment_mentions_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comment_mentions_mentioned_user_id_fkey'
            columns: ['mentioned_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comment_mentions_mentioned_by_user_id_fkey'
            columns: ['mentioned_by_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      activity_events: {
        Row: {
          id: string
          project_id: string
          actor_user_id: string | null
          event_type: string
          entity_type: string
          entity_id: string | null
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          actor_user_id?: string | null
          event_type: string
          entity_type: string
          entity_id?: string | null
          payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          actor_user_id?: string | null
          event_type?: string
          entity_type?: string
          entity_id?: string | null
          payload?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_events_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_events_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      project_wiki_pages: {
        Row: {
          id: string
          project_id: string
          title: string
          content: string
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title?: string
          content?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          content?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_wiki_pages_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_wiki_pages_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      project_documents: {
        Row: {
          id: string
          project_id: string
          user_id: string
          file_url: string
          name: string
          mime_type: string | null
          size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          file_url: string
          name: string
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          file_url?: string
          name?: string
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_documents_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_documents_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string | null
          work_package_id: string | null
          title: string
          description: string | null
          status: string | null
          priority: string | null
          assigned_to: string | null
          estimate_hours: number | null
          actual_hours: number | null
          blocked_by_task_id: string | null
          created_by: string | null
          due_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          work_package_id?: string | null
          title: string
          description?: string | null
          status?: string | null
          priority?: string | null
          assigned_to?: string | null
          estimate_hours?: number | null
          actual_hours?: number | null
          blocked_by_task_id?: string | null
          created_by?: string | null
          due_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          work_package_id?: string | null
          title?: string
          description?: string | null
          status?: string | null
          priority?: string | null
          assigned_to?: string | null
          estimate_hours?: number | null
          actual_hours?: number | null
          blocked_by_task_id?: string | null
          created_by?: string | null
          due_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_blocked_by_task_id_fkey'
            columns: ['blocked_by_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_work_package_id_fkey'
            columns: ['work_package_id']
            isOneToOne: false
            referencedRelation: 'work_packages'
            referencedColumns: ['id']
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          project_id: string | null
          user_id: string | null
          role: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          user_id?: string | null
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          user_id?: string | null
          role?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          id: string
        }
        Insert: {
          id: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          id: string
          task_id: string
          depends_on_task_id: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          depends_on_task_id: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          depends_on_task_id?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_dependencies_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_dependencies_depends_on_task_id_fkey'
            columns: ['depends_on_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_dependencies_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      time_entries: {
        Row: {
          id: string
          user_id: string
          project_id: string
          task_id: string | null
          entry_date: string
          minutes_spent: number
          is_billable: boolean
          category: string
          notes: string | null
          started_at: string | null
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          task_id?: string | null
          entry_date?: string
          minutes_spent: number
          is_billable?: boolean
          category?: string
          notes?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          task_id?: string | null
          entry_date?: string
          minutes_spent?: number
          is_billable?: boolean
          category?: string
          notes?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'time_entries_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_project_members_with_profile: {
        Args: {
          p_project_id: string
        }
        Returns: {
          member_id: string
          project_id: string
          user_id: string
          role: string | null
          joined_at: string | null
          full_name: string | null
          email: string | null
        }[]
      }
      invite_project_member_by_email: {
        Args: {
          p_project_id: string
          p_email: string
          p_role?: string
        }
        Returns: string
      }
      update_project_member_role: {
        Args: {
          p_project_id: string
          p_user_id: string
          p_role: string
        }
        Returns: void
      }
      remove_project_member: {
        Args: {
          p_project_id: string
          p_user_id: string
          p_unassign_unfinished_tasks: boolean
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
