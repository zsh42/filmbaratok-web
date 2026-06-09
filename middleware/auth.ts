export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const auth = useAuthStore()
  await auth.ensureInitialized()

  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
  }

  const needsSuperAdmin = to.meta.requiresSuperAdmin === true
  if (needsSuperAdmin && auth.user?.permissions?.includes('super_admin') !== true) {
    return navigateTo('/admin')
  }
})
