export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const auth = useAuthStore()
  if (auth.user?.permissions?.includes('super_admin') !== true) {
    return navigateTo('/admin')
  }
})
