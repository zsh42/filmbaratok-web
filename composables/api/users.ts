import { api } from './client'
import type { AdminUser } from '@/types/user'

export function listUsers() {
  return api.get<{ users: AdminUser[] }>('/api/users')
}

export function createUser(payload: { email: string; password: string }) {
  return api.post<{ user: AdminUser }>('/api/users', payload)
}

export function updateUser(id: number, payload: { email?: string }) {
  return api.put<{ user: AdminUser }>(`/api/users/${id}`, payload)
}

export function resetUserPassword(id: number, newPassword: string) {
  return api.post<{ ok: true }>(`/api/users/${id}/reset-password`, { newPassword })
}

export function deleteUser(id: number) {
  return api.delete<{ ok: true }>(`/api/users/${id}`)
}
