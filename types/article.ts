export interface Article {
  id: string
  author_id: string
  title: string
  summary: string | null
  document_path: string
  image_path: string | null
  created_at: string
  is_public: boolean
}
