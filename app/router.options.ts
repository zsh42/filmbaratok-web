import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return new Promise((resolve) => {
        const nuxtApp = useNuxtApp()
        nuxtApp.hooks.hookOnce('page:finish', () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve(savedPosition))
          })
        })
      })
    }

    if (to.hash) return { el: to.hash, top: 0 }

    if (to.path === from.path) return false

    return { left: 0, top: 0 }
  },
}
