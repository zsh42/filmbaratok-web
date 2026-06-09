import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '~/composables/api/auth'
import type { User } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)

  async function fetchMe() {
    loading.value = true
    try {
      const res = await authApi.me()
      user.value = res.user
    } catch {
      user.value = null
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  async function ensureInitialized() {
    if (!initialized.value) {
      await fetchMe()
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const res = await authApi.login({ email, password })
      user.value = res.user
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      user.value = null
    }
  }

  return {
    user,
    initialized,
    loading,
    isAuthenticated,
    fetchMe,
    ensureInitialized,
    login,
    logout,
  }
})
