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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
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
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
