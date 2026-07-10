export type UserRole = "reader" | "writer" | "admin"

export interface Profile {
  id: string
  birth_date: string | null
  phone: string | null
  role: UserRole
  created_at: string
}
