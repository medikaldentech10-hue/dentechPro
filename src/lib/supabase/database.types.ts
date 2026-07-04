import type { Profile, UserRole, UserType, VerificationStatus } from "@/lib/types/auth";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          requested_role?: "doctor" | "lab" | "vet" | "other" | null;
          clinic_name?: string | null;
          company_name?: string | null;
          city?: string | null;
          district?: string | null;
          specialty?: string | null;
          role?: UserRole;
          user_type?: UserType | null;
          verification_status?: VerificationStatus;
          can_view_prices?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, "id" | "created_at">>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          company_name: string | null;
          customer_type: "doctor" | "clinic" | "lab" | "vet" | "dealer" | "other";
          phone: string | null;
          email: string | null;
          city: string | null;
          district: string | null;
          tax_no: string | null;
          invoice_address: string | null;
          assigned_sales_rep_id: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company_name?: string | null;
          customer_type: "doctor" | "clinic" | "lab" | "vet" | "dealer" | "other";
          phone?: string | null;
          email?: string | null;
          city?: string | null;
          district?: string | null;
          tax_no?: string | null;
          invoice_address?: string | null;
          assigned_sales_rep_id?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at">
        >;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          status: "active" | "coming_soon" | "disabled";
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          name: string;
          slug: string;
          status?: "active" | "coming_soon" | "disabled";
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at">
        >;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          brand: string;
          category_id: string | null;
          product_group_code: string;
          product_name: string;
          description: string | null;
          usage_area: string | null;
          target_user_type: string[] | null;
          material_tags: string[] | null;
          procedure_tags: string[] | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand?: string;
          category_id?: string | null;
          product_group_code: string;
          product_name: string;
          description?: string | null;
          usage_area?: string | null;
          target_user_type?: string[] | null;
          material_tags?: string[] | null;
          procedure_tags?: string[] | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at">
        >;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          variant_code: string;
          manufacturer_ref: string | null;
          ikas_product_id: string | null;
          ikas_url: string | null;
          connection_type: string | null;
          iso_shank: string | null;
          diameter: number | null;
          length: number | null;
          grit: string | null;
          color: string | null;
          package_quantity: number;
          price: number | null;
          currency: string;
          stock_quantity: number;
          reserved_quantity: number;
          stock_status: "in_stock" | "low_stock" | "out_of_stock" | "ask_for_stock";
          uts_no: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_code: string;
          manufacturer_ref?: string | null;
          ikas_product_id?: string | null;
          ikas_url?: string | null;
          connection_type?: string | null;
          iso_shank?: string | null;
          diameter?: number | null;
          length?: number | null;
          grit?: string | null;
          color?: string | null;
          package_quantity?: number;
          price?: number | null;
          currency?: string;
          stock_quantity?: number;
          reserved_quantity?: number;
          stock_status?: "in_stock" | "low_stock" | "out_of_stock" | "ask_for_stock";
          uts_no?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["product_variants"]["Row"],
            "id" | "created_at"
          >
        >;
        Relationships: [];
      };
      order_drafts: {
        Row: {
          id: string;
          request_number: string | null;
          created_by_user_id: string | null;
          customer_id: string | null;
          customer_note: string | null;
          customer_payment_preference:
            | "bank_transfer"
            | "credit_card_link"
            | "cash"
            | "discuss_later"
            | null;
          source: "web" | "sales" | "whatsapp" | "admin";
          status:
            | "draft"
            | "submitted"
            | "contacted"
            | "whatsapp_approval_pending"
            | "payment_pending"
            | "payment_received"
            | "preparing"
            | "confirmed"
            | "shipped"
            | "completed"
            | "cancelled";
          subtotal: number;
          discount_total: number;
          total: number;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_number?: string | null;
          created_by_user_id?: string | null;
          customer_id?: string | null;
          customer_note?: string | null;
          customer_payment_preference?:
            | "bank_transfer"
            | "credit_card_link"
            | "cash"
            | "discuss_later"
            | null;
          source?: "web" | "sales" | "whatsapp" | "admin";
          status?:
            | "draft"
            | "submitted"
            | "contacted"
            | "whatsapp_approval_pending"
            | "payment_pending"
            | "payment_received"
            | "preparing"
            | "confirmed"
            | "shipped"
            | "completed"
            | "cancelled";
          subtotal?: number;
          discount_total?: number;
          total?: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["order_drafts"]["Row"],
            "id" | "created_at"
          >
        >;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_draft_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number | null;
          discount_percent: number;
          discount_amount: number;
          line_total: number;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_draft_id: string;
          variant_id: string;
          quantity?: number;
          unit_price?: number | null;
          discount_percent?: number;
          discount_amount?: number;
          line_total?: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["order_items"]["Row"],
            "id" | "created_at"
          >
        >;
        Relationships: [];
      };
      orders: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      payment_links: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      sales_notes: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      user_approvals: {
        Row: {
          id: string;
          user_id: string | null;
          reviewed_by_user_id: string | null;
          status: VerificationStatus;
          note: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          reviewed_by_user_id?: string | null;
          status?: VerificationStatus;
          note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["user_approvals"]["Row"],
            "id" | "created_at"
          >
        >;
        Relationships: [];
      };
      discount_permissions: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      search_logs: {
        Row: {
          id: string;
          user_id: string | null;
          query: string;
          normalized_query: string | null;
          interpreted_tokens: Json | null;
          result_count: number;
          used_ai: boolean;
          user_role: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          query: string;
          normalized_query?: string | null;
          interpreted_tokens?: Json | null;
          result_count?: number;
          used_ai?: boolean;
          user_role?: string | null;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          query?: string;
          normalized_query?: string | null;
          interpreted_tokens?: Json | null;
          result_count?: number;
          used_ai?: boolean;
          user_role?: string | null;
          source?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_value: Json | null;
          new_value: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id">
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
