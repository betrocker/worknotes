export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          phone: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          email?: string | null;
          name?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          user_id: string | null;
          name: string | null;
          phone: string | null;
          address: string | null;
          note: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name?: string | null;
          phone?: string | null;
          address?: string | null;
          note?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string | null;
          phone?: string | null;
          address?: string | null;
          note?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      jobs: {
        Row: {
          id: string;
          user_id: string | null;
          client_id: string | null;
          title: string | null;
          description: string | null;
          price: number | null;
          status: string | null;
          scheduled_date: string | null;
          completed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          client_id?: string | null;
          title?: string | null;
          description?: string | null;
          price?: number | null;
          status?: string | null;
          scheduled_date?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          client_id?: string | null;
          title?: string | null;
          description?: string | null;
          price?: number | null;
          status?: string | null;
          scheduled_date?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'jobs_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jobs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          job_id: string | null;
          title: string | null;
          amount: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          title?: string | null;
          amount?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          title?: string | null;
          amount?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          job_id: string | null;
          amount: number | null;
          payment_date: string | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          amount?: number | null;
          payment_date?: string | null;
          note?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          amount?: number | null;
          payment_date?: string | null;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      job_images: {
        Row: {
          id: string;
          job_id: string | null;
          user_id: string | null;
          kind: string | null;
          image_url: string | null;
          storage_path: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          user_id?: string | null;
          kind?: string | null;
          image_url?: string | null;
          storage_path?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          user_id?: string | null;
          kind?: string | null;
          image_url?: string | null;
          storage_path?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'job_images_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_images_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          user_id: string | null;
          job_id: string | null;
          invoice_number: string;
          sequence_number: number;
          year: number;
          issued_at: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          job_id?: string | null;
          invoice_number: string;
          sequence_number: number;
          year: number;
          issued_at?: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          job_id?: string | null;
          invoice_number?: string;
          sequence_number?: number;
          year?: number;
          issued_at?: string;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      job_invoice_items: {
        Row: {
          id: string;
          job_id: string | null;
          user_id: string | null;
          title: string | null;
          unit: string | null;
          quantity: number | null;
          unit_price: number | null;
          total: number | null;
          position: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          user_id?: string | null;
          title: string;
          unit?: string | null;
          quantity?: number | null;
          unit_price?: number | null;
          total?: number | null;
          position?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          user_id?: string | null;
          title?: string;
          unit?: string | null;
          quantity?: number | null;
          unit_price?: number | null;
          total?: number | null;
          position?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'job_invoice_items_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_invoice_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
