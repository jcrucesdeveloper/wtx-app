/**
 * Types for the Supabase schema in `supabase/migrations`.
 *
 * Hand-written in the shape `supabase gen types typescript` produces — once the
 * project is linked, regenerate with:
 *   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type RoomStatus = 'lobby' | 'active' | 'finished'
export type SetLogType = 'number' | 'W' | 'D'
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other'
export type ReportStatus = 'open' | 'actioned' | 'dismissed'
export type AppEventName =
  | 'app_opened'
  | 'account_created'
  | 'routine_created'
  | 'session_finished'
  | 'room_created'
  | 'room_joined'
  | 'session_shared'
  | 'kudos_given'
  | 'user_followed'

// A type alias, not an interface: supabase-js needs rows assignable to Record<string, unknown>.
export type RoomRow = {
  id: string
  code: string
  host_id: string | null
  routine_name: string
  routine_wtt: string
  unit: string | null
  status: RoomStatus
  created_at: string
  started_at: string | null
  finished_at: string | null
}

/** What follow_by_code / follow_user return about the person followed (`public.profile_card`). */
export type ProfileCard = {
  id: string
  display_name: string
  bio: string
}

/**
 * A composite-returning RPC that returns SQL `null` comes back from PostgREST
 * as a row of nulls — join_room / follow_by_code do this for an unknown code.
 */
export type EmptyRow<T> = { [K in keyof T]: null }

export type Database = {
  public: {
    Tables: {
      profiles: {
        // invite_code exists but only its owner can read it, via my_invite_code()
        // (column-level SELECT) — so it isn't part of the readable row.
        Row: {
          id: string
          display_name: string
          bio: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          bio?: string
          invite_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          bio?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          id: string
          user_id: string
          filename: string
          raw_text: string
          position: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          user_id: string
          filename: string
          raw_text: string
          position?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          filename?: string
          raw_text?: string
          position?: number
          deleted_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          routine_id: string | null
          room_id: string | null
          raw_text: string
          shared: boolean
          feed_snapshot: Json | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          user_id: string
          routine_id?: string | null
          room_id?: string | null
          raw_text: string
          shared?: boolean
          feed_snapshot?: Json | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          routine_id?: string | null
          room_id?: string | null
          raw_text?: string
          shared?: boolean
          feed_snapshot?: Json | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sessions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      rooms: {
        Row: RoomRow
        Insert: never
        Update: {
          status?: RoomStatus
        }
        Relationships: []
      }
      room_members: {
        Row: {
          room_id: string
          user_id: string
          joined_at: string
          finished_at: string | null
        }
        Insert: never
        Update: {
          finished_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'room_members_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'room_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      room_set_logs: {
        Row: {
          id: string
          room_id: string
          user_id: string
          exercise_name: string
          set_type: SetLogType
          weight: number
          reps: number
          completed_at: string
        }
        Insert: {
          id: string
          room_id: string
          user_id: string
          exercise_name: string
          set_type: SetLogType
          weight?: number
          reps?: number
          completed_at?: string
        }
        Update: {
          exercise_name?: string
          set_type?: SetLogType
          weight?: number
          reps?: number
        }
        Relationships: []
      }
      app_events: {
        Row: {
          id: number
          event: AppEventName
          user_id: string | null
          platform: string | null
          app_version: string | null
          created_at: string
        }
        // Only these columns are granted; created_at is always the server's.
        Insert: {
          event: AppEventName
          user_id?: string | null
          platform?: string | null
          app_version?: string | null
        }
        Update: never
        Relationships: []
      }
      follows: {
        Row: {
          follower_id: string
          followee_id: string
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey'
            columns: ['follower_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'follows_followee_id_fkey'
            columns: ['followee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      session_kudos: {
        Row: {
          session_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          session_id: string
          user_id: string
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'session_kudos_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_kudos_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        // Written only through the block_user RPC.
        Insert: never
        Update: never
        Relationships: []
      }
      content_reports: {
        // Insert-only from the app; reviewed in the dashboard.
        Row: {
          id: string
          reporter_id: string | null
          reported_user_id: string | null
          session_id: string | null
          reason: ReportReason
          details: string
          status: ReportStatus
          created_at: string
        }
        Insert: {
          reported_user_id: string
          session_id?: string | null
          reason: ReportReason
          details?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      create_room: {
        Args: { p_routine_wtt: string; p_routine_name: string; p_unit?: string | null }
        Returns: RoomRow
      }
      join_room: {
        Args: { p_code: string }
        Returns: RoomRow | EmptyRow<RoomRow>
      }
      follow_by_code: {
        Args: { p_code: string }
        Returns: ProfileCard | EmptyRow<ProfileCard>
      }
      follow_user: {
        Args: { p_user_id: string }
        Returns: ProfileCard
      }
      my_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      rotate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_profile: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          display_name: string
          bio: string
          created_at: string
          workout_count: number
          follower_count: number
          following_count: number
          i_follow: boolean
          follows_me: boolean
          trained_together: number
          workout_times: string[]
        }[]
      }
      block_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_blocked_users: {
        Args: Record<PropertyKey, never>
        Returns: { id: string; display_name: string; blocked_at: string }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: {
      profile_card: ProfileCard
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
