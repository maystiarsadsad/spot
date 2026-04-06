// Database types — will be replaced by Supabase generated types
// For now, manual definitions matching our schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BusinessType =
  | 'restaurant'
  | 'fast_food'
  | 'supermarket'
  | 'barbershop'
  | 'tattoo'
  | 'bar'
  | 'hotel'
  | 'hostel'
  | 'cafe'
  | 'gym'
  | 'laundry'
  | 'clothing'
  | 'veterinary'
  | 'custom'

export type PlatformRole = 'superadmin' | 'support' | 'user'
export type BusinessRole = 'owner' | 'admin' | 'manager' | 'employee'
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled'

export type TransactionType = 'order' | 'reservation' | 'appointment' | 'sale'
export type TransactionStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded'
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          phone: string | null
          locale: string
          platform_role: PlatformRole
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      businesses: {
        Row: {
          id: string
          name: string
          slug: string
          type: BusinessType
          owner_id: string
          logo_url: string | null
          cover_url: string | null
          favicon_url: string | null
          description: string | null
          tagline: string | null
          address: string | null
          city: string | null
          country: string
          phone: string | null
          email: string | null
          whatsapp: string | null
          social_links: Json
          business_hours: Json
          currency: string
          timezone: string
          locale: string
          theme: Json
          layout: Json
          custom_domain: string | null
          webpage_published: boolean
          subscription_plan: SubscriptionPlan
          subscription_status: SubscriptionStatus
          trial_ends_at: string | null
          onboarding_completed: boolean
          active: boolean
          suspended: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['businesses']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>
      }
      business_members: {
        Row: {
          id: string
          business_id: string
          user_id: string
          role: BusinessRole
          permissions: Json
          status: string
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['business_members']['Row'], 'id' | 'joined_at'>
        Update: Partial<Database['public']['Tables']['business_members']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      business_type: BusinessType
      platform_role: PlatformRole
      business_role: BusinessRole
      subscription_plan: SubscriptionPlan
    }
  }
}
