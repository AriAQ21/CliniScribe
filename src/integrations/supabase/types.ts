export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_id: number
          appointment_time: string
          created_at: string
          is_dummy: boolean
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          patient_name: string
          room: string
          user_id: number
        }
        Insert: {
          appointment_date: string
          appointment_id?: number
          appointment_time: string
          created_at?: string
          is_dummy?: boolean
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          patient_name: string
          room: string
          user_id: number
        }
        Update: {
          appointment_date?: string
          appointment_id?: number
          appointment_time?: string
          created_at?: string
          is_dummy?: boolean
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          patient_name?: string
          room?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audio_recordings: {
        Row: {
          appointment_id: number | null
          audio_id: string
          deleted_at: string | null
          file_path: string | null
          filename: string
          meeting_type: string | null
          metadata_storage_path: string | null
          status: string
          upload_time: string
          user_id: number
        }
        Insert: {
          appointment_id?: number | null
          audio_id?: string
          deleted_at?: string | null
          file_path?: string | null
          filename: string
          meeting_type?: string | null
          metadata_storage_path?: string | null
          status?: string
          upload_time?: string
          user_id: number
        }
        Update: {
          appointment_id?: number | null
          audio_id?: string
          deleted_at?: string | null
          file_path?: string | null
          filename?: string
          meeting_type?: string | null
          metadata_storage_path?: string | null
          status?: string
          upload_time?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "audio_recordings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "audio_recordings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          appointment_time: string | null
          audio_id: string
          location: string | null
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          metadata_filename: string
          no_of_speakers: number | null
          role: string | null
          transcribed_at: string
          transcript_filename: string
          transcript_storage_path: string | null
          transcription_id: number
        }
        Insert: {
          appointment_time?: string | null
          audio_id: string
          location?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          metadata_filename: string
          no_of_speakers?: number | null
          role?: string | null
          transcribed_at?: string
          transcript_filename: string
          transcript_storage_path?: string | null
          transcription_id?: number
        }
        Update: {
          appointment_time?: string | null
          audio_id?: string
          location?: string | null
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          metadata_filename?: string
          no_of_speakers?: number | null
          role?: string | null
          transcribed_at?: string
          transcript_filename?: string
          transcript_storage_path?: string | null
          transcription_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: true
            referencedRelation: "audio_recordings"
            referencedColumns: ["audio_id"]
          },
        ]
      }
      users: {
        Row: {
          email: string | null
          first_name: string
          last_name: string
          location: string | null
          password: string | null
          role: string | null
          user_id: number
        }
        Insert: {
          email?: string | null
          first_name: string
          last_name: string
          location?: string | null
          password?: string | null
          role?: string | null
          user_id?: number
        }
        Update: {
          email?: string | null
          first_name?: string
          last_name?: string
          location?: string | null
          password?: string | null
          role?: string | null
          user_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      meeting_type: "GP" | "MDT" | "WARD"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      meeting_type: ["GP", "MDT", "WARD"],
    },
  },
} as const
