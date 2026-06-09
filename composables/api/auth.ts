import { api } from './client'
import type { User } from '@/types/user'

export interface LoginPayload {
  email: string
  password: string
}

export function login(payload: LoginPayload) {
  return api.post<{ user: User }>('/api/auth/login', payload)
}

export function logout() {
  return api.post<void>('/api/auth/logout')
}

export function me() {
  return api.get<{ user: User }>('/api/auth/me')
}

export function refresh() {
  return api.post<{ user: User }>('/api/auth/refresh', undefined, { skipAuthRetry: true })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return api.post<{ ok: true }>('/api/auth/change-password', { currentPassword, newPassword })
}
