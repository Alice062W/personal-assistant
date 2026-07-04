export type Database = {
  public: {
    Tables: {
      gaming_sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          ended_at: string | null
          notified: boolean
        }
        Insert: {
          id?: string
          user_id: string
          started_at: string
          ended_at?: string | null
          notified?: boolean
        }
        Update: {
          ended_at?: string | null
          notified?: boolean
        }
      }
      user_settings: {
        Row: {
          user_id: string
          daily_limit_seconds: number
        }
        Insert: {
          user_id: string
          daily_limit_seconds: number
        }
        Update: {
          daily_limit_seconds?: number
        }
      }
      push_subscriptions: {
        Row: {
          user_id: string
          subscription: PushSubscriptionJSON
        }
        Insert: {
          user_id: string
          subscription: PushSubscriptionJSON
        }
        Update: {
          subscription?: PushSubscriptionJSON
        }
      }
    }
  }
}

export type GamingSession = Database['public']['Tables']['gaming_sessions']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
