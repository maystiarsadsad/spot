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
      ai_usage: {
        Row: {
          business_id: string
          cache_read_tokens: number
          cache_write_tokens: number
          cost_usd: number
          created_at: string
          engine: string
          error: string | null
          id: string
          input_tokens: number
          model: string | null
          output_tokens: number
          question: string | null
          source: string
          status: string
        }
        Insert: {
          business_id: string
          cache_read_tokens?: number
          cache_write_tokens?: number
          cost_usd?: number
          created_at?: string
          engine: string
          error?: string | null
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          question?: string | null
          source?: string
          status?: string
        }
        Update: {
          business_id?: string
          cache_read_tokens?: number
          cache_write_tokens?: number
          cost_usd?: number
          created_at?: string
          engine?: string
          error?: string | null
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          question?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          business_id: string | null
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_id?: string | null
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string | null
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_ai_settings: {
        Row: {
          business_id: string
          claude_enabled: boolean
          created_at: string | null
          daily_cap_usd: number
          extra_info: string | null
          faqs: Json
          greeting: string | null
          instructions: string | null
          key_last4: string | null
          key_secret_id: string | null
          key_verified_at: string | null
          model: string
          monthly_cap_usd: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          claude_enabled?: boolean
          created_at?: string | null
          daily_cap_usd?: number
          extra_info?: string | null
          faqs?: Json
          greeting?: string | null
          instructions?: string | null
          key_last4?: string | null
          key_secret_id?: string | null
          key_verified_at?: string | null
          model?: string
          monthly_cap_usd?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          claude_enabled?: boolean
          created_at?: string | null
          daily_cap_usd?: number
          extra_info?: string | null
          faqs?: Json
          greeting?: string | null
          instructions?: string | null
          key_last4?: string | null
          key_secret_id?: string | null
          key_verified_at?: string | null
          model?: string
          monthly_cap_usd?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_ai_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          id: string
          joined_at: string | null
          permissions: Json | null
          role: string
          status: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          id?: string
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          status?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          id?: string
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_modules: {
        Row: {
          business_id: string
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          label: string | null
          module_key: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          label?: string | null
          module_key: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          label?: string | null
          module_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_modules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_templates: {
        Row: {
          active: boolean | null
          business_type: string
          created_at: string | null
          created_by: string | null
          default_modules: Json
          description: string | null
          id: string
          layout: Json
          name: string
          preview_url: string | null
          sections: Json
          theme: Json
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          business_type: string
          created_at?: string | null
          created_by?: string | null
          default_modules?: Json
          description?: string | null
          id?: string
          layout?: Json
          name: string
          preview_url?: string | null
          sections?: Json
          theme?: Json
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          business_type?: string
          created_at?: string | null
          created_by?: string | null
          default_modules?: Json
          description?: string | null
          id?: string
          layout?: Json
          name?: string
          preview_url?: string | null
          sections?: Json
          theme?: Json
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          active: boolean | null
          address: string | null
          ai_agent_enabled: boolean | null
          ai_agent_greeting: string | null
          ai_agent_prompt: string | null
          assigned_to: string | null
          booking_settings: Json
          business_hours: Json | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          currency: string | null
          custom_domain: string | null
          description: string | null
          email: string | null
          favicon_url: string | null
          id: string
          internal_notes: string | null
          layout: Json | null
          locale: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          owner_id: string
          phone: string | null
          slug: string
          social_links: Json | null
          subscription_plan: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          suspended: boolean | null
          suspended_reason: string | null
          tagline: string | null
          theme: Json | null
          timezone: string | null
          trial_ends_at: string | null
          type: string
          updated_at: string | null
          webpage_published: boolean | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          ai_agent_enabled?: boolean | null
          ai_agent_greeting?: string | null
          ai_agent_prompt?: string | null
          assigned_to?: string | null
          booking_settings?: Json
          business_hours?: Json | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          description?: string | null
          email?: string | null
          favicon_url?: string | null
          id?: string
          internal_notes?: string | null
          layout?: Json | null
          locale?: string | null
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          owner_id: string
          phone?: string | null
          slug: string
          social_links?: Json | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          suspended?: boolean | null
          suspended_reason?: string | null
          tagline?: string | null
          theme?: Json | null
          timezone?: string | null
          trial_ends_at?: string | null
          type: string
          updated_at?: string | null
          webpage_published?: boolean | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          ai_agent_enabled?: boolean | null
          ai_agent_greeting?: string | null
          ai_agent_prompt?: string | null
          assigned_to?: string | null
          booking_settings?: Json
          business_hours?: Json | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          description?: string | null
          email?: string | null
          favicon_url?: string | null
          id?: string
          internal_notes?: string | null
          layout?: Json | null
          locale?: string | null
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          owner_id?: string
          phone?: string | null
          slug?: string
          social_links?: Json | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          suspended?: boolean | null
          suspended_reason?: string | null
          tagline?: string | null
          theme?: Json | null
          timezone?: string | null
          trial_ends_at?: string | null
          type?: string
          updated_at?: string | null
          webpage_published?: boolean | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_businesses_owner"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_categories: {
        Row: {
          active: boolean | null
          business_id: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_item_ingredients: {
        Row: {
          catalog_item_id: string
          created_at: string | null
          id: string
          inventory_id: string
          quantity: number
          unit: string | null
        }
        Insert: {
          catalog_item_id: string
          created_at?: string | null
          id?: string
          inventory_id: string
          quantity?: number
          unit?: string | null
        }
        Update: {
          catalog_item_id?: string
          created_at?: string | null
          id?: string
          inventory_id?: string
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_item_ingredients_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_item_ingredients_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          active: boolean | null
          business_id: string
          capacity: number | null
          category_id: string | null
          compare_price: number | null
          cost: number | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          featured: boolean | null
          id: string
          image_url: string | null
          images: Json | null
          inventory_id: string | null
          membership_days: number | null
          membership_sessions: number | null
          metadata: Json | null
          name: string
          options: Json | null
          price: number
          sku: string | null
          sort_order: number | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          business_id: string
          capacity?: number | null
          category_id?: string | null
          compare_price?: number | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          images?: Json | null
          inventory_id?: string | null
          membership_days?: number | null
          membership_sessions?: number | null
          metadata?: Json | null
          name: string
          options?: Json | null
          price?: number
          sku?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          business_id?: string
          capacity?: number | null
          category_id?: string | null
          compare_price?: number | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          images?: Json | null
          inventory_id?: string | null
          membership_days?: number | null
          membership_sessions?: number | null
          metadata?: Json | null
          name?: string
          options?: Json | null
          price?: number
          sku?: string | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          business_id: string
          checked_at: string
          contact_id: string
          id: string
          membership_id: string | null
          note: string | null
        }
        Insert: {
          business_id: string
          checked_at?: string
          contact_id: string
          id?: string
          membership_id?: string | null
          note?: string | null
        }
        Update: {
          business_id?: string
          checked_at?: string
          contact_id?: string
          id?: string
          membership_id?: string | null
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          business_id: string
          class_date: string
          class_id: string
          contact_id: string
          created_at: string | null
          id: string
          status: string
        }
        Insert: {
          business_id: string
          class_date: string
          class_id: string
          contact_id: string
          created_at?: string | null
          id?: string
          status?: string
        }
        Update: {
          business_id?: string
          class_date?: string
          class_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "gym_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          business_id: string
          created_at: string | null
          date_of_birth: string | null
          document_number: string | null
          document_type: string | null
          email: string | null
          full_name: string
          id: string
          last_visit_at: string | null
          member_code: string | null
          metadata: Json | null
          notes: string | null
          phone: string | null
          portal_token: string | null
          tags: Json | null
          total_spent: number | null
          total_visits: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string | null
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name: string
          id?: string
          last_visit_at?: string | null
          member_code?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          portal_token?: string | null
          tags?: Json | null
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string | null
          date_of_birth?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_visit_at?: string | null
          member_code?: string | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          portal_token?: string | null
          tags?: Json | null
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_accounts: {
        Row: {
          business_id: string
          contact_id: string
          created_at: string | null
          credit_limit: number
          current_balance: number
          guarantor_document: string | null
          guarantor_id: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          guarantor_relationship: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          contact_id: string
          created_at?: string | null
          credit_limit?: number
          current_balance?: number
          guarantor_document?: string | null
          guarantor_id?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          guarantor_relationship?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          contact_id?: string
          created_at?: string | null
          credit_limit?: number
          current_balance?: number
          guarantor_document?: string | null
          guarantor_id?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          guarantor_relationship?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_accounts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_accounts_guarantor_id_fkey"
            columns: ["guarantor_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_payments: {
        Row: {
          amount: number
          created_at: string | null
          credit_account_id: string
          id: string
          notes: string | null
          payment_method: string | null
          recorded_by: string | null
          transaction_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_account_id: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          transaction_id?: string | null
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_account_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          transaction_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_cash: {
        Row: {
          business_id: string
          closed_by: string | null
          closing_balance: number | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          opening_balance: number | null
          status: string | null
          total_cash_in: number | null
          total_digital_in: number | null
          total_expenses: number | null
          total_sales: number | null
        }
        Insert: {
          business_id: string
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          opening_balance?: number | null
          status?: string | null
          total_cash_in?: number | null
          total_digital_in?: number | null
          total_expenses?: number | null
          total_sales?: number | null
        }
        Update: {
          business_id?: string
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          opening_balance?: number | null
          status?: string | null
          total_cash_in?: number | null
          total_digital_in?: number | null
          total_expenses?: number | null
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_cash_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          business_id: string
          courier_accuracy: number | null
          courier_heading: number | null
          courier_lat: number | null
          courier_lng: number | null
          courier_name: string | null
          courier_token: string
          created_at: string | null
          delivered_at: string | null
          dest_lat: number | null
          dest_lng: number | null
          id: string
          location_updated_at: string | null
          started_at: string | null
          status: string
          tracking_token: string
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          courier_accuracy?: number | null
          courier_heading?: number | null
          courier_lat?: number | null
          courier_lng?: number | null
          courier_name?: string | null
          courier_token?: string
          created_at?: string | null
          delivered_at?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          id?: string
          location_updated_at?: string | null
          started_at?: string | null
          status?: string
          tracking_token?: string
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          courier_accuracy?: number | null
          courier_heading?: number | null
          courier_lat?: number | null
          courier_lng?: number | null
          courier_name?: string | null
          courier_token?: string
          created_at?: string | null
          delivered_at?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          id?: string
          location_updated_at?: string | null
          started_at?: string | null
          status?: string
          tracking_token?: string
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_services: {
        Row: {
          business_id: string
          catalog_item_id: string
          employee_id: string
        }
        Insert: {
          business_id: string
          catalog_item_id: string
          employee_id: string
        }
        Update: {
          business_id?: string
          catalog_item_id?: string
          employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bookable: boolean
          business_id: string
          created_at: string | null
          department: string | null
          document_id: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string
          hire_date: string | null
          id: string
          notes: string | null
          phone: string | null
          position: string
          salary: number
          salary_type: string | null
          schedule: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          bookable?: boolean
          business_id: string
          created_at?: string | null
          department?: string | null
          document_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          position: string
          salary?: number
          salary_type?: string | null
          schedule?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          bookable?: boolean
          business_id?: string
          created_at?: string | null
          department?: string | null
          document_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          position?: string
          salary?: number
          salary_type?: string | null
          schedule?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string | null
          date: string | null
          description: string
          id: string
          payment_method: string | null
          receipt_url: string | null
          recurring: boolean | null
          recurring_interval: string | null
          registered_by: string | null
        }
        Insert: {
          amount: number
          business_id: string
          category: string
          created_at?: string | null
          date?: string | null
          description: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          recurring?: boolean | null
          recurring_interval?: string | null
          registered_by?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string | null
          date?: string | null
          description?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          recurring?: boolean | null
          recurring_interval?: string | null
          registered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_classes: {
        Row: {
          active: boolean
          business_id: string
          capacity: number
          created_at: string | null
          duration_minutes: number
          id: string
          instructor_id: string | null
          item_id: string | null
          name: string
          start_time: string
          weekday: number
        }
        Insert: {
          active?: boolean
          business_id: string
          capacity?: number
          created_at?: string | null
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          item_id?: string | null
          name: string
          start_time: string
          weekday: number
        }
        Update: {
          active?: boolean
          business_id?: string
          capacity?: number
          created_at?: string | null
          duration_minutes?: number
          id?: string
          instructor_id?: string | null
          item_id?: string | null
          name?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_classes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_classes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          active: boolean | null
          barcode: string | null
          business_id: string
          category: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          id: string
          last_restock_at: string | null
          location: string | null
          min_stock: number | null
          name: string
          notes: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          business_id: string
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          last_restock_at?: string | null
          location?: string | null
          min_stock?: number | null
          name: string
          notes?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          business_id?: string
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          last_restock_at?: string | null
          location?: string | null
          min_stock?: number | null
          name?: string
          notes?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          inventory_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          registered_by: string | null
          total_cost: number | null
          type: string
          unit_cost: number | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          inventory_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          registered_by?: string | null
          total_cost?: number | null
          type: string
          unit_cost?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          registered_by?: string | null
          total_cost?: number | null
          type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          business_id: string
          contact_id: string
          created_at: string | null
          ends_on: string
          id: string
          notes: string | null
          plan_id: string | null
          plan_name: string
          price: number | null
          sessions_total: number | null
          sessions_used: number
          source: string
          starts_on: string
          status: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          contact_id: string
          created_at?: string | null
          ends_on: string
          id?: string
          notes?: string | null
          plan_id?: string | null
          plan_name: string
          price?: number | null
          sessions_total?: number | null
          sessions_used?: number
          source?: string
          starts_on: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          contact_id?: string
          created_at?: string | null
          ends_on?: string
          id?: string
          notes?: string | null
          plan_id?: string | null
          plan_name?: string
          price?: number | null
          sessions_total?: number | null
          sessions_used?: number
          source?: string
          starts_on?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          business_id: string | null
          created_at: string | null
          id: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          base_salary: number
          bonuses: number | null
          business_id: string
          created_at: string | null
          deductions: number | null
          employee_id: string
          id: string
          net_pay: number
          notes: string | null
          overtime_hours: number | null
          overtime_pay: number | null
          paid_at: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          status: string | null
          tax: number | null
          updated_at: string | null
        }
        Insert: {
          base_salary: number
          bonuses?: number | null
          business_id: string
          created_at?: string | null
          deductions?: number | null
          employee_id: string
          id?: string
          net_pay: number
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          status?: string | null
          tax?: number | null
          updated_at?: string | null
        }
        Update: {
          base_salary?: number
          bonuses?: number | null
          business_id?: string
          created_at?: string | null
          deductions?: number | null
          employee_id?: string
          id?: string
          net_pay?: number
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          tax?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          locale: string | null
          phone: string | null
          platform_role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          locale?: string | null
          phone?: string | null
          platform_role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          locale?: string | null
          phone?: string | null
          platform_role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          window_start: string
        }
        Update: {
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          business_id: string
          contact_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          employee_id: string | null
          end_time: string | null
          id: string
          item_id: string | null
          manage_token: string | null
          notes: string | null
          party_size: number | null
          price: number | null
          reservation_time: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          contact_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          employee_id?: string | null
          end_time?: string | null
          id?: string
          item_id?: string | null
          manage_token?: string | null
          notes?: string | null
          party_size?: number | null
          price?: number | null
          reservation_time: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          contact_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          employee_id?: string | null
          end_time?: string | null
          id?: string
          item_id?: string | null
          manage_token?: string | null
          notes?: string | null
          party_size?: number | null
          price?: number | null
          reservation_time?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          business_id: string
          created_at: string | null
          date: string
          employee_id: string
          end_time: string | null
          hours_worked: number | null
          id: string
          notes: string | null
          start_time: string
          status: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          date: string
          employee_id: string
          end_time?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          start_time: string
          status?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          date?: string
          employee_id?: string
          end_time?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_time_off: {
        Row: {
          business_id: string
          created_at: string | null
          employee_id: string
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          employee_id: string
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          employee_id?: string
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          options: Json | null
          quantity: number
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          options?: Json | null
          quantity?: number
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          options?: Json | null
          quantity?: number
          total_price?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          address: string | null
          admin_notes: string | null
          business_id: string
          code: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          id: string
          metadata: Json | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          scheduled_at: string | null
          scheduled_end: string | null
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          business_id: string
          code?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          scheduled_at?: string | null
          scheduled_end?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          business_id?: string
          code?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          scheduled_at?: string | null
          scheduled_end?: string | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      webpage_proposals: {
        Row: {
          approved_at: string | null
          business_id: string | null
          content: Json
          created_at: string | null
          created_by: string | null
          id: string
          layout: Json
          modules: Json
          notes: string | null
          prospect_business_name: string | null
          prospect_business_type: string | null
          prospect_email: string | null
          prospect_name: string | null
          prospect_phone: string | null
          rejection_reason: string | null
          sections: Json
          sent_at: string | null
          share_token: string | null
          share_url: string | null
          status: string | null
          template_id: string | null
          theme: Json
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          approved_at?: string | null
          business_id?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          layout?: Json
          modules?: Json
          notes?: string | null
          prospect_business_name?: string | null
          prospect_business_type?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          prospect_phone?: string | null
          rejection_reason?: string | null
          sections?: Json
          sent_at?: string | null
          share_token?: string | null
          share_url?: string | null
          status?: string | null
          template_id?: string | null
          theme?: Json
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          approved_at?: string | null
          business_id?: string | null
          content?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          layout?: Json
          modules?: Json
          notes?: string | null
          prospect_business_name?: string | null
          prospect_business_type?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          prospect_phone?: string | null
          rejection_reason?: string | null
          sections?: Json
          sent_at?: string | null
          share_token?: string | null
          share_url?: string | null
          status?: string | null
          template_id?: string | null
          theme?: Json
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webpage_proposals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webpage_proposals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "business_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      webpage_sections: {
        Row: {
          business_id: string
          content: Json
          created_at: string | null
          id: string
          section_type: string
          sort_order: number | null
          title: string | null
          updated_at: string | null
          visible: boolean | null
        }
        Insert: {
          business_id: string
          content?: Json
          created_at?: string | null
          id?: string
          section_type: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Update: {
          business_id?: string
          content?: Json
          created_at?: string | null
          id?: string
          section_type?: string
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "webpage_sections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_class_spot: {
        Args: {
          p_business_id: string
          p_class_id: string
          p_contact_id: string
          p_date: string
        }
        Returns: string
      }
      courier_set_status: {
        Args: { p_name?: string; p_status: string; p_token: string }
        Returns: boolean
      }
      courier_update_location: {
        Args: {
          p_accuracy?: number
          p_heading?: number
          p_lat: number
          p_lng: number
          p_token: string
        }
        Returns: boolean
      }
      delivery_public_payload: {
        Args: { d: Database["public"]["Tables"]["deliveries"]["Row"] }
        Returns: Json
      }
      get_business_ai_key: { Args: { p_business_id: string }; Returns: string }
      get_business_as_superadmin: {
        Args: { business_id: string }
        Returns: {
          active: boolean | null
          address: string | null
          ai_agent_enabled: boolean | null
          ai_agent_greeting: string | null
          ai_agent_prompt: string | null
          assigned_to: string | null
          booking_settings: Json
          business_hours: Json | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          currency: string | null
          custom_domain: string | null
          description: string | null
          email: string | null
          favicon_url: string | null
          id: string
          internal_notes: string | null
          layout: Json | null
          locale: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          onboarding_step: number | null
          owner_id: string
          phone: string | null
          slug: string
          social_links: Json | null
          subscription_plan: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          suspended: boolean | null
          suspended_reason: string | null
          tagline: string | null
          theme: Json | null
          timezone: string | null
          trial_ends_at: string | null
          type: string
          updated_at: string | null
          webpage_published: boolean | null
          whatsapp: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_courier_delivery: { Args: { p_token: string }; Returns: Json }
      get_delivery_tracking: { Args: { p_token: string }; Returns: Json }
      is_business_member: { Args: { b_id: string }; Returns: boolean }
      is_business_owner_or_admin: { Args: { b_id: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      rate_limit_hit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      set_business_ai_key: {
        Args: { p_business_id: string; p_key: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
