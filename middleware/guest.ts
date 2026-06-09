export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const auth = useAuthStore()
  await auth.ensureInitialized()

  if (auth.isAuthenticated) {
    return navigateTo('/admin')
  }
})
