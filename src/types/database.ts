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
          metadata: Json | null
          notes: string | null
          phone: string | null
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
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
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
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
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
      employees: {
        Row: {
          avatar_url: string | null
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
      inventory: {
        Row: {
          active: boolean | null
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
      reservations: {
        Row: {
          business_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          end_time: string | null
          id: string
          item_id: string | null
          notes: string | null
          party_size: number | null
          reservation_time: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          end_time?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          party_size?: number | null
          reservation_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_time?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          party_size?: number | null
          reservation_time?: string
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
      is_business_member: { Args: { b_id: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
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
