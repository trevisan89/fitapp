/**
 * Tipos do banco de dados — mesmo formato do output do Supabase CLI:
 *
 *   npx supabase gen types typescript --local > src/types/database.types.ts
 *
 * Mantenha este arquivo em sincronia com
 * `supabase/migrations/01_initial_schema.sql`.
 */

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
        Row: {
          id: string;
          nome: string;
          whatsapp: string | null;
          slug: string;
          logo_url: string | null;
          cor_primaria: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plano_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          whatsapp?: string | null;
          slug: string;
          logo_url?: string | null;
          cor_primaria?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plano_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          whatsapp?: string | null;
          slug?: string;
          logo_url?: string | null;
          cor_primaria?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plano_status?: string;
          created_at?: string;
        };
        // FK de profiles.id -> auth.users(id) fica fora do schema public
        // e, por isso, não é listada aqui.
        Relationships: [];
      };
      alunos: {
        Row: {
          id: string;
          professional_id: string;
          nome: string;
          whatsapp: string | null;
          token_acesso: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          professional_id: string;
          nome: string;
          whatsapp?: string | null;
          token_acesso?: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          professional_id?: string;
          nome?: string;
          whatsapp?: string | null;
          token_acesso?: string;
          ativo?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alunos_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      exercicios_catalogo: {
        Row: {
          id: string;
          professional_id: string | null;
          nome: string;
          grupo_muscular: string;
          video_gif_url: string | null;
          instrucoes: string | null;
        };
        Insert: {
          id?: string;
          professional_id?: string | null;
          nome: string;
          grupo_muscular: string;
          video_gif_url?: string | null;
          instrucoes?: string | null;
        };
        Update: {
          id?: string;
          professional_id?: string | null;
          nome?: string;
          grupo_muscular?: string;
          video_gif_url?: string | null;
          instrucoes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exercicios_catalogo_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fichas_treino: {
        Row: {
          id: string;
          aluno_id: string;
          professional_id: string;
          titulo: string;
          ativa: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          aluno_id: string;
          professional_id: string;
          titulo: string;
          ativa?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          aluno_id?: string;
          professional_id?: string;
          titulo?: string;
          ativa?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fichas_treino_aluno_id_fkey";
            columns: ["aluno_id"];
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fichas_treino_professional_id_fkey";
            columns: ["professional_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      treino_dias: {
        Row: {
          id: string;
          ficha_id: string;
          letra: string;
          nome_dia: string | null;
          ordem: number;
        };
        Insert: {
          id?: string;
          ficha_id: string;
          letra: string;
          nome_dia?: string | null;
          ordem?: number;
        };
        Update: {
          id?: string;
          ficha_id?: string;
          letra?: string;
          nome_dia?: string | null;
          ordem?: number;
        };
        Relationships: [
          {
            foreignKeyName: "treino_dias_ficha_id_fkey";
            columns: ["ficha_id"];
            referencedRelation: "fichas_treino";
            referencedColumns: ["id"];
          },
        ];
      };
      treino_itens: {
        Row: {
          id: string;
          treino_dia_id: string;
          exercicio_id: string;
          series: number;
          repeticoes: string | null;
          carga_sugerida: string | null;
          descanso_segundos: number | null;
          ordem: number;
          notas: string | null;
        };
        Insert: {
          id?: string;
          treino_dia_id: string;
          exercicio_id: string;
          series: number;
          repeticoes?: string | null;
          carga_sugerida?: string | null;
          descanso_segundos?: number | null;
          ordem?: number;
          notas?: string | null;
        };
        Update: {
          id?: string;
          treino_dia_id?: string;
          exercicio_id?: string;
          series?: number;
          repeticoes?: string | null;
          carga_sugerida?: string | null;
          descanso_segundos?: number | null;
          ordem?: number;
          notas?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "treino_itens_treino_dia_id_fkey";
            columns: ["treino_dia_id"];
            referencedRelation: "treino_dias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treino_itens_exercicio_id_fkey";
            columns: ["exercicio_id"];
            referencedRelation: "exercicios_catalogo";
            referencedColumns: ["id"];
          },
        ];
      };
      treino_logs: {
        Row: {
          id: string;
          aluno_id: string;
          treino_item_id: string;
          data: string;
          series_feitas: number | null;
          carga_utilizada: number | null;
          rpe: number | null;
          concluido: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          aluno_id: string;
          treino_item_id: string;
          data?: string;
          series_feitas?: number | null;
          carga_utilizada?: number | null;
          rpe?: number | null;
          concluido?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          aluno_id?: string;
          treino_item_id?: string;
          data?: string;
          series_feitas?: number | null;
          carga_utilizada?: number | null;
          rpe?: number | null;
          concluido?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treino_logs_aluno_id_fkey";
            columns: ["aluno_id"];
            referencedRelation: "alunos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treino_logs_treino_item_id_fkey";
            columns: ["treino_item_id"];
            referencedRelation: "treino_itens";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

/** Row (leitura) de uma tabela: `Tables<"alunos">` */
export type Tables<TName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TName]["Row"];

/** Payload de insert de uma tabela: `TablesInsert<"alunos">` */
export type TablesInsert<TName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TName]["Insert"];

/** Payload de update de uma tabela: `TablesUpdate<"alunos">` */
export type TablesUpdate<TName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TName]["Update"];
