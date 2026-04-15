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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          require_2fa: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          require_2fa?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          require_2fa?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      business_profiles: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          branch_code: string | null
          business_logo: string | null
          business_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_default: boolean
          physical_address: string | null
          terms_and_conditions: string | null
          updated_at: string
          website_address: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_code?: string | null
          business_logo?: string | null
          business_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          physical_address?: string | null
          terms_and_conditions?: string | null
          updated_at?: string
          website_address?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_code?: string | null
          business_logo?: string | null
          business_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          physical_address?: string | null
          terms_and_conditions?: string | null
          updated_at?: string
          website_address?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          lead_id: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          template_data: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          template_data?: Json | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          template_data?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          product_name: string
          quantity: number
          sort_order: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          product_name: string
          quantity?: number
          sort_order?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          product_name?: string
          quantity?: number
          sort_order?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          business_profile_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          is_recurring: boolean
          issue_date: string
          next_recurrence_date: string | null
          notes: string | null
          paid_amount: number | null
          recurrence_interval: string | null
          recurring_parent_id: string | null
          status: string
          tax_amount: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount?: number
          business_profile_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          is_recurring?: boolean
          issue_date?: string
          next_recurrence_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          recurrence_interval?: string | null
          recurring_parent_id?: string | null
          status?: string
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          business_profile_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          is_recurring?: boolean
          issue_date?: string
          next_recurrence_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          recurrence_interval?: string | null
          recurring_parent_id?: string | null
          status?: string
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_recurring_parent_id_fkey"
            columns: ["recurring_parent_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          assigned_at: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_criteria_checks: {
        Row: {
          checked: boolean
          checked_at: string | null
          checked_by: string | null
          criteria_id: string
          id: string
          lead_id: string
        }
        Insert: {
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          criteria_id: string
          id?: string
          lead_id: string
        }
        Update: {
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          criteria_id?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_criteria_checks_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "stage_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_criteria_checks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          client_name: string
          created_at: string
          created_by: string | null
          email: string | null
          generated_by: string | null
          id: string
          notes: string | null
          package: string | null
          phone: string | null
          position: number
          salesperson_id: string | null
          source: string | null
          stage_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          package?: string | null
          phone?: string | null
          position?: number
          salesperson_id?: string | null
          source?: string | null
          stage_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          generated_by?: string | null
          id?: string
          notes?: string | null
          package?: string | null
          phone?: string | null
          position?: number
          salesperson_id?: string | null
          source?: string | null
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespersons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: string[]
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          position: number
          price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          position?: number
          price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          position?: number
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          checkout_id: string | null
          client_name: string | null
          created_at: string
          currency: string
          customer_email: string | null
          id: string
          metadata: Json | null
          package_name: string
          payment_id: string | null
          proof_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          checkout_id?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          id?: string
          metadata?: Json | null
          package_name: string
          payment_id?: string | null
          proof_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          checkout_id?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          id?: string
          metadata?: Json | null
          package_name?: string
          payment_id?: string | null
          proof_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          is_active: boolean
          name: string
          photos: string[] | null
          price: number
          sku: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean
          name: string
          photos?: string[] | null
          price?: number
          sku?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean
          name?: string
          photos?: string[] | null
          price?: number
          sku?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          require_2fa: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          require_2fa?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          require_2fa?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotation_line_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          product_name: string
          quantity: number
          quotation_id: string
          sort_order: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          product_name: string
          quantity?: number
          quotation_id: string
          sort_order?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          product_name?: string
          quantity?: number
          quotation_id?: string
          sort_order?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_line_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          amount: number
          business_profile_id: string | null
          client_id: string | null
          converted_to_invoice: boolean
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          expiry_date: string | null
          id: string
          issue_date: string
          notes: string | null
          quotation_number: string
          status: string
          tax_amount: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount?: number
          business_profile_id?: string | null
          client_id?: string | null
          converted_to_invoice?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          quotation_number: string
          status?: string
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          business_profile_id?: string | null
          client_id?: string | null
          converted_to_invoice?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          quotation_number?: string
          status?: string
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_targets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          period_month: number | null
          period_quarter: number | null
          period_type: string
          period_year: number
          target_amount_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          period_month?: number | null
          period_quarter?: number | null
          period_type: string
          period_year: number
          target_amount_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          period_month?: number | null
          period_quarter?: number | null
          period_type?: string
          period_year?: number
          target_amount_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      salespersons: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stage_criteria: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          stage_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          stage_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_criteria_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin"
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
      app_role: ["super_admin", "admin"],
    },
  },
} as const
