export interface User {
  id: string
  email: string
  name?: string
  permissions?: string[]
  lastLogin?: string | null
}

export interface AdminUser {
  id: number
  email: string
  permissions: string[]
  lastLogin: string | null
  createdAt: string
}
