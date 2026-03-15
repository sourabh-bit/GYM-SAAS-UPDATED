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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          gym_id: string
          id: string
          member_id: string | null
          member_name: string | null
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          gym_id: string
          id?: string
          member_id?: string | null
          member_name?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string | null
          member_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_name: string | null
          actor_user_id: string | null
          category: string
          created_at: string
          detail: string | null
          id: string
          metadata: Json | null
          severity: string
          target_id: string | null
          target_label: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_user_id?: string | null
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          severity?: string
          target_id?: string | null
          target_label?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_user_id?: string | null
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          severity?: string
          target_id?: string | null
          target_label?: string | null
        }
        Relationships: []
      }
      challenge_completions: {
        Row: {
          challenge_key: string
          challenge_name: string
          completed_at: string
          created_at: string
          gym_id: string
          id: string
          member_id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          challenge_key: string
          challenge_name: string
          completed_at?: string
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          challenge_key?: string
          challenge_name?: string
          completed_at?: string
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_completions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_completions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_plan_requests: {
        Row: {
          created_at: string
          gym_id: string
          gym_name: string | null
          id: string
          message: string | null
          owner_name: string | null
          request_type: string
          requested_plan_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          gym_name?: string | null
          id?: string
          message?: string | null
          owner_name?: string | null
          request_type?: string
          requested_plan_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          gym_name?: string | null
          id?: string
          message?: string | null
          owner_name?: string | null
          request_type?: string
          requested_plan_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_plan_requests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_plan_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          id: string
          label: string
          name: string
          rollout: number
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          label: string
          name: string
          rollout?: number
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          label?: string
          name?: string
          rollout?: number
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      gyms: {
        Row: {
          address: string | null
          created_at: string
          current_plan_id: string | null
          deleted_at: string | null
          id: string
          is_suspended: boolean
          name: string
          owner_preferences: Json
          owner_id: string
          phone: string | null
          plan_expires_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          current_plan_id?: string | null
          deleted_at?: string | null
          id?: string
          is_suspended?: boolean
          name: string
          owner_preferences?: Json
          owner_id: string
          phone?: string | null
          plan_expires_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          current_plan_id?: string | null
          deleted_at?: string | null
          id?: string
          is_suspended?: boolean
          name?: string
          owner_preferences?: Json
          owner_id?: string
          phone?: string | null
          plan_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gyms_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      member_xp: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          level: number
          member_id: string
          streak_days: number
          tier: string
          total_challenges_completed: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          level?: number
          member_id: string
          streak_days?: number
          tier?: string
          total_challenges_completed?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          level?: number
          member_id?: string
          streak_days?: number
          tier?: string
          total_challenges_completed?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_xp_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_xp_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          autopay_enabled: boolean
          created_at: string
          due_amount: number
          email: string | null
          expiry_at: string | null
          gateway_customer_id: string | null
          gateway_subscription_id: string | null
          gym_id: string
          id: string
          joined_at: string
          last_checkin: string | null
          last_payment: number | null
          name: string
          payment_date: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          plan_id: string | null
          plan_name: string | null
          status: Database["public"]["Enums"]["member_status"]
          trainer_id: string | null
          user_id: string | null
        }
        Insert: {
          autopay_enabled?: boolean
          created_at?: string
          due_amount?: number
          email?: string | null
          expiry_at?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          gym_id: string
          id?: string
          joined_at?: string
          last_checkin?: string | null
          last_payment?: number | null
          name: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          plan_id?: string | null
          plan_name?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          trainer_id?: string | null
          user_id?: string | null
        }
        Update: {
          autopay_enabled?: boolean
          created_at?: string
          due_amount?: number
          email?: string | null
          expiry_at?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          gym_id?: string
          id?: string
          joined_at?: string
          last_checkin?: string | null
          last_payment?: number | null
          name?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          plan_id?: string | null
          plan_name?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          trainer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profile_settings: {
        Row: {
          age: number | null
          created_at: string
          gender: string | null
          goal_months: number
          goal_weight: number | null
          gym_id: string
          height_cm: number | null
          member_id: string
          migrated_from_local: boolean
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          gender?: string | null
          goal_months?: number
          goal_weight?: number | null
          gym_id: string
          height_cm?: number | null
          member_id: string
          migrated_from_local?: boolean
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          gender?: string | null
          goal_months?: number
          goal_weight?: number | null
          gym_id?: string
          height_cm?: number | null
          member_id?: string
          migrated_from_local?: boolean
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profile_settings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_profile_settings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_progress_entries: {
        Row: {
          created_at: string
          entry_date: string
          gym_id: string
          id: string
          member_id: string
          metrics: Json
          notes: string
          user_id: string
          weight: number | null
          workout: boolean
        }
        Insert: {
          created_at?: string
          entry_date?: string
          gym_id: string
          id?: string
          member_id: string
          metrics?: Json
          notes?: string
          user_id: string
          weight?: number | null
          workout?: boolean
        }
        Update: {
          created_at?: string
          entry_date?: string
          gym_id?: string
          id?: string
          member_id?: string
          metrics?: Json
          notes?: string
          user_id?: string
          weight?: number | null
          workout?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "member_progress_entries_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_progress_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_workout_plans: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          member_id: string
          migrated_from_local: boolean
          updated_at: string
          user_id: string
          week_plan: Json
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          migrated_from_local?: boolean
          updated_at?: string
          user_id: string
          week_plan?: Json
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          migrated_from_local?: boolean
          updated_at?: string
          user_id?: string
          week_plan?: Json
        }
        Relationships: [
          {
            foreignKeyName: "member_workout_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_workout_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_workout_sessions: {
        Row: {
          completed_sets: number
          created_at: string
          duration_seconds: number
          gym_id: string
          id: string
          member_id: string
          metadata: Json
          plan_name: string | null
          session_date: string
          total_sets: number
          user_id: string
        }
        Insert: {
          completed_sets?: number
          created_at?: string
          duration_seconds?: number
          gym_id: string
          id?: string
          member_id: string
          metadata?: Json
          plan_name?: string | null
          session_date?: string
          total_sets?: number
          user_id: string
        }
        Update: {
          completed_sets?: number
          created_at?: string
          duration_seconds?: number
          gym_id?: string
          id?: string
          member_id?: string
          metadata?: Json
          plan_name?: string | null
          session_date?: string
          total_sets?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_workout_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_workout_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          created_at: string
          dedupe_key: string | null
          dedupe_recipient: string
          gym_id: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          recipient_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          audience?: string
          created_at?: string
          dedupe_key?: string | null
          dedupe_recipient?: string
          gym_id: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          recipient_user_id?: string | null
          title: string
          type?: string
        }
        Update: {
          audience?: string
          created_at?: string
          dedupe_key?: string | null
          dedupe_recipient?: string
          gym_id?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          recipient_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_customers: {
        Row: {
          created_at: string
          gateway: string
          gateway_customer_id: string
          gym_id: string
          id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          gateway?: string
          gateway_customer_id: string
          gym_id: string
          id?: string
          member_id: string
        }
        Update: {
          created_at?: string
          gateway?: string
          gateway_customer_id?: string
          gym_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_customers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_customers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_dunning_attempts: {
        Row: {
          attempt_no: number
          created_at: string
          gateway: string
          gym_id: string
          id: string
          last_error: string | null
          member_id: string
          next_retry_at: string | null
          plan_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_no?: number
          created_at?: string
          gateway?: string
          gym_id: string
          id?: string
          last_error?: string | null
          member_id: string
          next_retry_at?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_no?: number
          created_at?: string
          gateway?: string
          gym_id?: string
          id?: string
          last_error?: string | null
          member_id?: string
          next_retry_at?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_dunning_attempts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_dunning_attempts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_dunning_attempts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway: string
          gateway_payment_link_id: string | null
          gateway_order_id: string | null
          gateway_subscription_id: string | null
          gym_id: string
          id: string
          member_id: string
          payment_link_url: string | null
          plan_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway?: string
          gateway_payment_link_id?: string | null
          gateway_order_id?: string | null
          gateway_subscription_id?: string | null
          gym_id: string
          id?: string
          member_id: string
          payment_link_url?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway?: string
          gateway_payment_link_id?: string | null
          gateway_order_id?: string | null
          gateway_subscription_id?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          payment_link_url?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_subscriptions: {
        Row: {
          autopay_enabled: boolean
          created_at: string
          current_end: string | null
          current_start: string | null
          gateway: string
          gateway_subscription_id: string
          gym_id: string
          id: string
          member_id: string
          next_charge_at: string | null
          plan_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          autopay_enabled?: boolean
          created_at?: string
          current_end?: string | null
          current_start?: string | null
          gateway?: string
          gateway_subscription_id: string
          gym_id: string
          id?: string
          member_id: string
          next_charge_at?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          autopay_enabled?: boolean
          created_at?: string
          current_end?: string | null
          current_start?: string | null
          gateway?: string
          gateway_subscription_id?: string
          gym_id?: string
          id?: string
          member_id?: string
          next_charge_at?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          gateway: string
          id: string
          payload: Json
          processed_at: string | null
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          gateway: string
          id?: string
          payload: Json
          processed_at?: string | null
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          gateway?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          gym_id: string
          id: string
          is_active: boolean
          name: string
          price: number
          razorpay_plan_amount: number | null
          razorpay_plan_currency: string | null
          razorpay_plan_id: string | null
          razorpay_plan_interval: string | null
          razorpay_plan_interval_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          razorpay_plan_amount?: number | null
          razorpay_plan_currency?: string | null
          razorpay_plan_id?: string | null
          razorpay_plan_interval?: string | null
          razorpay_plan_interval_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          razorpay_plan_amount?: number | null
          razorpay_plan_currency?: string | null
          razorpay_plan_id?: string | null
          razorpay_plan_interval?: string | null
          razorpay_plan_interval_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          features: Json
          id: string
          is_active: boolean
          max_members: number
          name: string
          price: number
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_members?: number
          name: string
          price?: number
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_members?: number
          name?: string
          price?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          allow_google_signin: boolean
          api_rate_limit_per_min: number
          billing_grace_days: number
          billing_retry_schedule_days: number[]
          default_currency: string
          default_timezone: string
          enable_two_factor: boolean
          force_password_reset_90: boolean
          id: number
          login_attempts_before_lock: number
          maintenance_message: string
          maintenance_mode: boolean
          notification_failed_payment: boolean
          notification_health_alerts: boolean
          notification_new_gym: boolean
          notification_weekly_report: boolean
          platform_name: string
          require_email_verification: boolean
          smtp_from_email: string
          smtp_from_name: string
          smtp_host: string
          smtp_port: number
          support_email: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_google_signin?: boolean
          api_rate_limit_per_min?: number
          billing_grace_days?: number
          billing_retry_schedule_days?: number[]
          default_currency?: string
          default_timezone?: string
          enable_two_factor?: boolean
          force_password_reset_90?: boolean
          id?: number
          login_attempts_before_lock?: number
          maintenance_message?: string
          maintenance_mode?: boolean
          notification_failed_payment?: boolean
          notification_health_alerts?: boolean
          notification_new_gym?: boolean
          notification_weekly_report?: boolean
          platform_name?: string
          require_email_verification?: boolean
          smtp_from_email?: string
          smtp_from_name?: string
          smtp_host?: string
          smtp_port?: number
          support_email?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_google_signin?: boolean
          api_rate_limit_per_min?: number
          billing_grace_days?: number
          billing_retry_schedule_days?: number[]
          default_currency?: string
          default_timezone?: string
          enable_two_factor?: boolean
          force_password_reset_90?: boolean
          id?: number
          login_attempts_before_lock?: number
          maintenance_message?: string
          maintenance_mode?: boolean
          notification_failed_payment?: boolean
          notification_health_alerts?: boolean
          notification_new_gym?: boolean
          notification_weekly_report?: boolean
          platform_name?: string
          require_email_verification?: boolean
          smtp_from_email?: string
          smtp_from_name?: string
          smtp_host?: string
          smtp_port?: number
          support_email?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          gym_id: string | null
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          gym_id?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          gym_id?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          end_date: string | null
          gateway: string | null
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_subscription_id: string | null
          gym_id: string
          id: string
          member_id: string | null
          member_name: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          plan_id: string | null
          plan_name: string | null
          start_date: string
        }
        Insert: {
          amount?: number
          amount_paid?: number
          created_at?: string
          end_date?: string | null
          gateway?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_subscription_id?: string | null
          gym_id: string
          id?: string
          member_id?: string | null
          member_name?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_id?: string | null
          plan_name?: string | null
          start_date?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          end_date?: string | null
          gateway?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_subscription_id?: string | null
          gym_id?: string
          id?: string
          member_id?: string | null
          member_name?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_id?: string | null
          plan_name?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          created_at: string
          email: string | null
          gym_id: string
          id: string
          members_count: number
          name: string
          phone: string | null
          rating: number | null
          schedule: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["trainer_status"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          gym_id: string
          id?: string
          members_count?: number
          name: string
          phone?: string | null
          rating?: number | null
          schedule?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["trainer_status"]
        }
        Update: {
          created_at?: string
          email?: string | null
          gym_id?: string
          id?: string
          members_count?: number
          name?: string
          phone?: string | null
          rating?: number | null
          schedule?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["trainer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "trainers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          gym_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          gym_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          gym_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_gym_data: {
        Args: { _gym_id: string; _user_id?: string }
        Returns: boolean
      }
      current_user_gym_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_global_leaderboard_anonymized: {
        Args: { p_limit?: number; p_tier?: string | null }
        Returns: {
          display_name: string
          is_current_user: boolean
          level: number
          rank: number
          streak_days: number
          tier: string
          total_challenges_completed: number
          xp: number
        }[]
      }
      get_user_gym_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owner_assign_plan: {
        Args: {
          p_member_id: string
          p_plan_id: string
          p_start_at?: string
        }
        Returns: Json
      }
      owner_check_in_member: {
        Args: { p_member_id: string; p_member_name: string }
        Returns: string
      }
      owner_check_out_session: {
        Args: { p_attendance_id: string }
        Returns: string
      }
      owner_record_payment: {
        Args: {
          p_amount: number
          p_member_id: string
          p_payment_method: string
          p_upi_ref?: string
        }
        Returns: Json
      }
      owner_set_member_trainer: {
        Args: { p_member_id: string; p_trainer_id?: string }
        Returns: Json
      }
      is_super_admin: {
        Args: { _user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "trainer" | "frontdesk" | "member" | "super_admin"
      member_status: "active" | "expired" | "frozen" | "trial"
      payment_status: "paid" | "pending" | "overdue" | "partial"
      trainer_status: "active" | "on_leave" | "inactive"
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
      app_role: ["owner", "trainer", "frontdesk", "member", "super_admin"],
      member_status: ["active", "expired", "frozen", "trial"],
      payment_status: ["paid", "pending", "overdue", "partial"],
      trainer_status: ["active", "on_leave", "inactive"],
    },
  },
} as const
