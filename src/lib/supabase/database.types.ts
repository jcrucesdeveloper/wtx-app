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

/** Why `suggested_profiles` put someone forward, strongest first. */
export type SuggestionReason = 'trained_together' | 'follows_you' | 'friend_of_friend' | 'new'

/** One workout as `social_feed` returns it. */
export type FeedRow = {
  session_id: string
  user_id: string
  display_name: string
  raw_text: string
  room_id: string | null
  created_at: string
  kudos_count: number
  comment_count: number
  gave_kudos: boolean
}

/** A person in a list (search, followers, suggestions) and how they relate to you. */
export type PersonRow = {
  id: string
  display_name: string
  is_following: boolean
  follows_me: boolean
}

export type SocialProfileRow = {
  id: string
  display_name: string
  share_workouts: boolean
  created_at: string
  followers_count: number
  following_count: number
  workouts_count: number
  is_following: boolean
  follows_me: boolean
}

export type CommentRow = {
  id: string
  user_id: string
  display_name: string
  body: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          share_workouts: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          share_workouts?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          share_workouts?: boolean
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
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          routine_id?: string | null
          room_id?: string | null
          raw_text?: string
          deleted_at?: string | null
        }
        Relationships: []
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
      set_logs: {
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
      follows: {
        Row: {
          follower_id: string
          followee_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          followee_id: string
          created_at?: string
        }
        Update: never
        Relationships: []
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
        Relationships: []
      }
      session_comments: {
        Row: {
          id: string
          session_id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          body: string
          created_at?: string
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
        Returns: RoomRow
      }
      social_feed: {
        Args: {
          p_user_id?: string | null
          p_before?: string | null
          p_before_id?: string | null
          p_limit?: number
          p_session_id?: string | null
        }
        Returns: FeedRow[]
      }
      social_profile: {
        Args: { p_user_id: string }
        Returns: SocialProfileRow[]
      }
      search_profiles: {
        Args: { p_query: string }
        Returns: PersonRow[]
      }
      suggested_profiles: {
        Args: { p_limit?: number }
        Returns: { id: string; display_name: string; reason: SuggestionReason; follows_me: boolean }[]
      }
      follow_list: {
        Args: { p_user_id: string; p_kind: 'followers' | 'following' }
        Returns: PersonRow[]
      }
      post_comments: {
        Args: { p_session_id: string }
        Returns: CommentRow[]
      }
      post_kudos: {
        Args: { p_session_id: string }
        Returns: { user_id: string; display_name: string }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
