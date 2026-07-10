// Reflejo manual del esquema definido en supabase/migrations/*.sql.
// Regenerar con `npx supabase gen types typescript --local` en cuanto haya
// una instancia local (Docker) para validar que coincide exactamente.

export type UserRole = "reader" | "writer" | "admin"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          birth_date: string | null
          phone: string | null
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          birth_date?: string | null
          phone?: string | null
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          birth_date?: string | null
          phone?: string | null
          role?: UserRole
          created_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          id: string
          author_id: string
          title: string
          summary: string | null
          document_path: string
          image_path: string | null
          created_at: string
          is_public: boolean
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          summary?: string | null
          document_path: string
          image_path?: string | null
          created_at?: string
          is_public?: boolean
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          summary?: string | null
          document_path?: string
          image_path?: string | null
          created_at?: string
          is_public?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      views: {
        Row: {
          id: string
          article_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          article_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          id: string
          article_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          article_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          id: string
          article_id: string
          user_id: string
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          article_id: string
          user_id: string
          comment: string
          created_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          user_id?: string
          comment?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          id: string
          article_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          article_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_embeddings: {
        Row: {
          id: string
          article_id: string
          content_hash: string
          embedding: string
          embedding_model: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          article_id: string
          content_hash: string
          embedding: number[] | string
          embedding_model?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          content_hash?: string
          embedding?: number[] | string
          embedding_model?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_embeddings_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      match_article_embeddings: {
        Args: {
          query_embedding: number[] | string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          article_id: string
          title: string
          summary: string | null
          document_path: string
          similarity: number
        }[]
      }
    }
    Enums: Record<string, never>
  }
}
