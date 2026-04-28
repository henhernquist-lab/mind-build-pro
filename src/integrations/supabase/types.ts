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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_classes: {
        Row: {
          class_name: string
          created_at: string
          current_grade: string | null
          current_grade_pct: number | null
          difficulty: string
          id: string
          period: string | null
          sort_order: number
          teacher: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_name: string
          created_at?: string
          current_grade?: string | null
          current_grade_pct?: number | null
          difficulty?: string
          id?: string
          period?: string | null
          sort_order?: number
          teacher?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_name?: string
          created_at?: string
          current_grade?: string | null
          current_grade_pct?: number | null
          difficulty?: string
          id?: string
          period?: string | null
          sort_order?: number
          teacher?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      academic_profile: {
        Row: {
          academic_goals: string[]
          gpa: number | null
          gpa_weighted: boolean
          grade_level: string | null
          homework_load: string | null
          needs_improvement: string | null
          needs_improvement_override: boolean
          strongest_subject: string | null
          strongest_subject_override: boolean
          study_hours_per_day: number
          study_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_goals?: string[]
          gpa?: number | null
          gpa_weighted?: boolean
          grade_level?: string | null
          homework_load?: string | null
          needs_improvement?: string | null
          needs_improvement_override?: boolean
          strongest_subject?: string | null
          strongest_subject_override?: boolean
          study_hours_per_day?: number
          study_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_goals?: string[]
          gpa?: number | null
          gpa_weighted?: boolean
          grade_level?: string | null
          homework_load?: string | null
          needs_improvement?: string | null
          needs_improvement_override?: boolean
          strongest_subject?: string | null
          strongest_subject_override?: boolean
          study_hours_per_day?: number
          study_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      academic_stats: {
        Row: {
          period_start: string
          tutor_xp_date: string
          tutor_xp_today: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          period_start?: string
          tutor_xp_date?: string
          tutor_xp_today?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          period_start?: string
          tutor_xp_date?: string
          tutor_xp_today?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      athlete_profile: {
        Row: {
          age: number
          fitness_goals: string[]
          gender: string
          height_ft: number
          height_in: number
          injuries: string | null
          other_sport: string | null
          position_event: string | null
          primary_sports: string[]
          training_days_per_week: number
          updated_at: string
          user_id: string
          weight_lbs: number
          years_experience: string | null
        }
        Insert: {
          age?: number
          fitness_goals?: string[]
          gender?: string
          height_ft?: number
          height_in?: number
          injuries?: string | null
          other_sport?: string | null
          position_event?: string | null
          primary_sports?: string[]
          training_days_per_week?: number
          updated_at?: string
          user_id: string
          weight_lbs?: number
          years_experience?: string | null
        }
        Update: {
          age?: number
          fitness_goals?: string[]
          gender?: string
          height_ft?: number
          height_in?: number
          injuries?: string | null
          other_sport?: string | null
          position_event?: string | null
          primary_sports?: string[]
          training_days_per_week?: number
          updated_at?: string
          user_id?: string
          weight_lbs?: number
          years_experience?: string | null
        }
        Relationships: []
      }
      boss_customizations: {
        Row: {
          boss_emoji: string | null
          boss_name: string | null
          boss_personality: string | null
          created_at: string
          id: string
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          boss_emoji?: string | null
          boss_name?: string | null
          boss_personality?: string | null
          created_at?: string
          id?: string
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          boss_emoji?: string | null
          boss_name?: string | null
          boss_personality?: string | null
          created_at?: string
          id?: string
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_blocks: {
        Row: {
          category: string
          created_at: string
          date: string
          end_time: string
          id: string
          label: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          date: string
          end_time: string
          id?: string
          label?: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          label?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_labels: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_overrides: {
        Row: {
          category: string | null
          created_at: string
          date: string
          end_time: string | null
          id: string
          label: string | null
          override_type: string
          recurring_id: string
          start_time: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          label?: string | null
          override_type: string
          recurring_id: string
          start_time?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          label?: string | null
          override_type?: string
          recurring_id?: string
          start_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_overrides_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "planner_recurring"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_recurring: {
        Row: {
          category: string
          created_at: string
          end_date: string | null
          end_time: string
          id: string
          label: string
          rule: Json
          start_date: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          end_date?: string | null
          end_time: string
          id?: string
          label?: string
          rule?: Json
          start_date: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          end_date?: string | null
          end_time?: string
          id?: string
          label?: string
          rule?: Json
          start_date?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          grade: string | null
          id: string
          school_name: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          grade?: string | null
          id?: string
          school_name?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          grade?: string | null
          id?: string
          school_name?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      rank_history: {
        Row: {
          created_at: string
          final_xp: number
          highest_rank_icon: string
          highest_rank_name: string
          id: string
          month_key: string
          month_name: string
          period_end: string | null
          period_start: string | null
          rank_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          final_xp: number
          highest_rank_icon: string
          highest_rank_name: string
          id?: string
          month_key: string
          month_name: string
          period_end?: string | null
          period_start?: string | null
          rank_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          final_xp?: number
          highest_rank_icon?: string
          highest_rank_name?: string
          id?: string
          month_key?: string
          month_name?: string
          period_end?: string | null
          period_start?: string | null
          rank_type?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_chats: {
        Row: {
          created_at: string
          id: string
          messages: Json
          subject_color: string
          subject_emoji: string
          subject_id: string
          subject_label: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          subject_color?: string
          subject_emoji?: string
          subject_id: string
          subject_label: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          subject_color?: string
          subject_emoji?: string
          subject_id?: string
          subject_label?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          description: string | null
          emoji: string
          id: string
          label: string
          slug: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          label: string
          slug: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          first_name: string | null
          sounds_enabled: boolean
          theme: string
          updated_at: string
          user_id: string
          videos_enabled: boolean
          weight_unit: string
        }
        Insert: {
          first_name?: string | null
          sounds_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id: string
          videos_enabled?: boolean
          weight_unit?: string
        }
        Update: {
          first_name?: string | null
          sounds_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          videos_enabled?: boolean
          weight_unit?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          current_month: string
          period_start: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          current_month?: string
          period_start?: string
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          current_month?: string
          period_start?: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          added_weight: number | null
          breakdown: string | null
          created_at: string
          exercise: string
          grade: string | null
          id: string
          is_pr: boolean | null
          logged_at: string
          note: string | null
          sport: string
          unit: string
          user_id: string
          value: number
          xp: number | null
        }
        Insert: {
          added_weight?: number | null
          breakdown?: string | null
          created_at?: string
          exercise: string
          grade?: string | null
          id?: string
          is_pr?: boolean | null
          logged_at?: string
          note?: string | null
          sport: string
          unit: string
          user_id: string
          value: number
          xp?: number | null
        }
        Update: {
          added_weight?: number | null
          breakdown?: string | null
          created_at?: string
          exercise?: string
          grade?: string | null
          id?: string
          is_pr?: boolean | null
          logged_at?: string
          note?: string | null
          sport?: string
          unit?: string
          user_id?: string
          value?: number
          xp?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_athlete_card: {
        Args: { _username: string }
        Returns: {
          academic_xp: number
          age: number
          avatar_url: string
          bio: string
          display_name: string
          fitness_goals: string[]
          gpa: number
          grade: string
          grade_level: string
          height_ft: number
          height_in: number
          other_sport: string
          position_event: string
          primary_sports: string[]
          school_name: string
          total_xp: number
          training_days_per_week: number
          username: string
          weight_lbs: number
          years_experience: string
        }[]
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
    Enums: {},
  },
} as const
