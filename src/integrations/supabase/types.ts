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
      academic_tests: {
        Row: {
          completed: boolean
          created_at: string
          difficulty: string
          id: string
          notes: string | null
          score: number | null
          subject: string
          test_date: string
          title: string
          topics: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          difficulty?: string
          id?: string
          notes?: string | null
          score?: number | null
          subject: string
          test_date: string
          title: string
          topics?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          difficulty?: string
          id?: string
          notes?: string | null
          score?: number | null
          subject?: string
          test_date?: string
          title?: string
          topics?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ace_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          badge_id: string
          id: string
          progress: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          id?: string
          progress?: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          id?: string
          progress?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      athlete_profile: {
        Row: {
          age: number
          fitness_goals: string[]
          gender: string
          graduation_year: number | null
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
          graduation_year?: number | null
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
          graduation_year?: number | null
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
      colleges: {
        Row: {
          academic_avg_gpa: number | null
          act_min: number | null
          athletic_level: string | null
          computed_at: string | null
          created_at: string
          division: string | null
          id: string
          key_stat_targets: Json | null
          location: string | null
          match_breakdown: Json | null
          match_score: number | null
          match_summary: string | null
          name: string
          notes: string | null
          priority: number
          response_status: string | null
          sat_min: number | null
          sport: string | null
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          academic_avg_gpa?: number | null
          act_min?: number | null
          athletic_level?: string | null
          computed_at?: string | null
          created_at?: string
          division?: string | null
          id?: string
          key_stat_targets?: Json | null
          location?: string | null
          match_breakdown?: Json | null
          match_score?: number | null
          match_summary?: string | null
          name: string
          notes?: string | null
          priority?: number
          response_status?: string | null
          sat_min?: number | null
          sport?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          academic_avg_gpa?: number | null
          act_min?: number | null
          athletic_level?: string | null
          computed_at?: string | null
          created_at?: string
          division?: string | null
          id?: string
          key_stat_targets?: Json | null
          location?: string | null
          match_breakdown?: Json | null
          match_score?: number | null
          match_summary?: string | null
          name?: string
          notes?: string | null
          priority?: number
          response_status?: string | null
          sat_min?: number | null
          sport?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          category: string
          challenge_date: string
          challenge_id: string
          claimed: boolean
          created_at: string
          description: string
          id: string
          progress: number
          target: number
          title: string
          updated_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          category?: string
          challenge_date?: string
          challenge_id: string
          claimed?: boolean
          created_at?: string
          description: string
          id?: string
          progress?: number
          target?: number
          title: string
          updated_at?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          category?: string
          challenge_date?: string
          challenge_id?: string
          claimed?: boolean
          created_at?: string
          description?: string
          id?: string
          progress?: number
          target?: number
          title?: string
          updated_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      lift_max_history: {
        Row: {
          bodyweight_lbs: number | null
          created_at: string
          estimated_1rm_lbs: number
          exercise: string
          formula_avg: number | null
          id: string
          reps_used: number
          strength_grade: string | null
          user_id: string
          weight_used: number
        }
        Insert: {
          bodyweight_lbs?: number | null
          created_at?: string
          estimated_1rm_lbs: number
          exercise: string
          formula_avg?: number | null
          id?: string
          reps_used: number
          strength_grade?: string | null
          user_id: string
          weight_used: number
        }
        Update: {
          bodyweight_lbs?: number | null
          created_at?: string
          estimated_1rm_lbs?: number
          exercise?: string
          formula_avg?: number | null
          id?: string
          reps_used?: number
          strength_grade?: string | null
          user_id?: string
          weight_used?: number
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          ai_estimated: boolean
          calories: number
          carbs_g: number
          created_at: string
          description: string
          fat_g: number
          id: string
          log_date: string
          meal_type: string
          protein_g: number
          user_id: string
        }
        Insert: {
          ai_estimated?: boolean
          calories?: number
          carbs_g?: number
          created_at?: string
          description: string
          fat_g?: number
          id?: string
          log_date?: string
          meal_type?: string
          protein_g?: number
          user_id: string
        }
        Update: {
          ai_estimated?: boolean
          calories?: number
          carbs_g?: number
          created_at?: string
          description?: string
          fat_g?: number
          id?: string
          log_date?: string
          meal_type?: string
          protein_g?: number
          user_id?: string
        }
        Relationships: []
      }
      nutrition_prefs: {
        Row: {
          allergies: string | null
          preferences: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          preferences?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          preferences?: string | null
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
      practice_attempts: {
        Row: {
          answers: Json
          correct_count: number
          created_at: string
          duration_seconds: number
          id: string
          score_pct: number
          subject: string
          test_id: string
          total_count: number
          user_id: string
          weak_topics: string[] | null
        }
        Insert: {
          answers?: Json
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          score_pct?: number
          subject: string
          test_id: string
          total_count?: number
          user_id: string
          weak_topics?: string[] | null
        }
        Update: {
          answers?: Json
          correct_count?: number
          created_at?: string
          duration_seconds?: number
          id?: string
          score_pct?: number
          subject?: string
          test_id?: string
          total_count?: number
          user_id?: string
          weak_topics?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "practice_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_tests: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          questions: Json
          source: string
          source_note_id: string | null
          subject: string
          topic: string | null
          total_questions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          questions?: Json
          source?: string
          source_note_id?: string | null
          subject: string
          topic?: string | null
          total_questions?: number
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          questions?: Json
          source?: string
          source_note_id?: string | null
          subject?: string
          topic?: string | null
          total_questions?: number
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
      recruitment_contacts: {
        Row: {
          college_id: string
          created_at: string
          email: string | null
          id: string
          last_contacted: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          college_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_contacted?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          college_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_contacted?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_contacts_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_milestones: {
        Row: {
          college_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          occurred_on: string
          title: string
          user_id: string
        }
        Insert: {
          college_id: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          occurred_on?: string
          title: string
          user_id: string
        }
        Update: {
          college_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          occurred_on?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_milestones_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_tasks: {
        Row: {
          college_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          college_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          college_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_tasks_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
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
      season_awards: {
        Row: {
          award_icon: string
          award_name: string
          award_type: string
          created_at: string
          description: string | null
          id: string
          snapshot_id: string
          user_id: string
        }
        Insert: {
          award_icon: string
          award_name: string
          award_type: string
          created_at?: string
          description?: string | null
          id?: string
          snapshot_id: string
          user_id: string
        }
        Update: {
          award_icon?: string
          award_name?: string
          award_type?: string
          created_at?: string
          description?: string | null
          id?: string
          snapshot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_awards_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "season_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      season_optin: {
        Row: {
          opted_in: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          opted_in?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          opted_in?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      season_results: {
        Row: {
          badge_earned: string | null
          bonus_xp_awarded: number
          claimed: boolean
          claimed_at: string | null
          created_at: string
          id: string
          placement: number | null
          rank_type: string
          season_id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          badge_earned?: string | null
          bonus_xp_awarded?: number
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          id?: string
          placement?: number | null
          rank_type: string
          season_id: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          badge_earned?: string | null
          bonus_xp_awarded?: number
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          id?: string
          placement?: number | null
          rank_type?: string
          season_id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_results_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_rewards: {
        Row: {
          badge_icon: string | null
          badge_name: string | null
          bonus_xp: number
          created_at: string
          id: string
          placement: number
          season_id: string
        }
        Insert: {
          badge_icon?: string | null
          badge_name?: string | null
          bonus_xp?: number
          created_at?: string
          id?: string
          placement: number
          season_id: string
        }
        Update: {
          badge_icon?: string | null
          badge_name?: string | null
          bonus_xp?: number
          created_at?: string
          id?: string
          placement?: number
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_snapshots: {
        Row: {
          academic_xp: number
          ai_recap: string | null
          athletic_xp: number
          best_single_day_xp: number
          ceremony_seen: boolean
          created_at: string
          end_date: string
          id: string
          is_best_season: boolean
          peak_academic_rank_icon: string | null
          peak_academic_rank_name: string | null
          peak_athletic_rank_icon: string | null
          peak_athletic_rank_name: string | null
          season_number: number
          start_date: string
          top_subject: string | null
          total_games: number
          total_prs: number
          total_workouts: number
          user_id: string
        }
        Insert: {
          academic_xp?: number
          ai_recap?: string | null
          athletic_xp?: number
          best_single_day_xp?: number
          ceremony_seen?: boolean
          created_at?: string
          end_date: string
          id?: string
          is_best_season?: boolean
          peak_academic_rank_icon?: string | null
          peak_academic_rank_name?: string | null
          peak_athletic_rank_icon?: string | null
          peak_athletic_rank_name?: string | null
          season_number: number
          start_date: string
          top_subject?: string | null
          total_games?: number
          total_prs?: number
          total_workouts?: number
          user_id: string
        }
        Update: {
          academic_xp?: number
          ai_recap?: string | null
          athletic_xp?: number
          best_single_day_xp?: number
          ceremony_seen?: boolean
          created_at?: string
          end_date?: string
          id?: string
          is_best_season?: boolean
          peak_academic_rank_icon?: string | null
          peak_academic_rank_name?: string | null
          peak_athletic_rank_icon?: string | null
          peak_athletic_rank_name?: string | null
          season_number?: number
          start_date?: string
          top_subject?: string | null
          total_games?: number
          total_prs?: number
          total_workouts?: number
          user_id?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          rank_type: string
          season_type: string
          start_date: string
          status: string
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          rank_type?: string
          season_type: string
          start_date: string
          status?: string
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          rank_type?: string
          season_type?: string
          start_date?: string
          status?: string
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      study_notes: {
        Row: {
          ai_summary: string | null
          content: string
          created_at: string
          id: string
          subject: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          content?: string
          created_at?: string
          id?: string
          subject: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          content?: string
          created_at?: string
          id?: string
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_streak: {
        Row: {
          current_streak: number
          last_study_date: string | null
          longest_streak: number
          multiplier_active_until: string | null
          total_study_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_study_date?: string | null
          longest_streak?: number
          multiplier_active_until?: string | null
          total_study_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_study_date?: string | null
          longest_streak?: number
          multiplier_active_until?: string | null
          total_study_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subject_weakness: {
        Row: {
          dismissed_at: string | null
          flagged_for_review: boolean
          id: string
          last_two_scores: number[]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          flagged_for_review?: boolean
          id?: string
          last_two_scores?: number[]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          flagged_for_review?: boolean
          id?: string
          last_two_scores?: number[]
          subject?: string
          updated_at?: string
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
          accent_hue: number | null
          first_name: string | null
          onboarding_completed: boolean
          sounds_enabled: boolean
          theme: string
          updated_at: string
          user_id: string
          videos_enabled: boolean
          weight_unit: string
        }
        Insert: {
          accent_hue?: number | null
          first_name?: string | null
          onboarding_completed?: boolean
          sounds_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id: string
          videos_enabled?: boolean
          weight_unit?: string
        }
        Update: {
          accent_hue?: number | null
          first_name?: string | null
          onboarding_completed?: boolean
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
      vocab_words: {
        Row: {
          created_at: string
          deck: string
          definition: string
          due_at: string
          ease: number
          example: string | null
          id: string
          interval_days: number
          last_reviewed_at: string | null
          mastered: boolean
          reps: number
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          deck?: string
          definition: string
          due_at?: string
          ease?: number
          example?: string | null
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          mastered?: boolean
          reps?: number
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          deck?: string
          definition?: string
          due_at?: string
          ease?: number
          example?: string | null
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          mastered?: boolean
          reps?: number
          user_id?: string
          word?: string
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
      user_water_goals: {
        Row: {
          goal_ml: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          goal_ml?: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          goal_ml?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          drink_type: string
          hydration_credit_ml: number
          id: string
          input_method: string
          is_water: boolean
          log_date: string
          logged_at: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount_ml: number
          drink_type?: string
          hydration_credit_ml: number
          id?: string
          input_method?: string
          is_water?: boolean
          log_date: string
          logged_at?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount_ml?: number
          drink_type?: string
          hydration_credit_ml?: number
          id?: string
          input_method?: string
          is_water?: boolean
          log_date?: string
          logged_at?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_season_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          academic_rank_icon: string
          academic_xp: number
          athletic_rank_icon: string
          athletic_xp: number
          avatar_url: string
          display_name: string
          total_xp: number
          user_id: string
          username: string
        }[]
      }
      get_leaderboard: {
        Args: { _limit?: number; _rank_type: string }
        Returns: {
          avatar_url: string
          display_name: string
          period_start: string
          user_id: string
          username: string
          xp: number
        }[]
      }
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
      get_season_leaderboard: {
        Args: { _limit?: number; _season_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          rank_type: string
          user_id: string
          username: string
          xp: number
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
