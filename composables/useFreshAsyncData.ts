import type { AsyncDataOptions } from '#app'

export function useFreshAsyncData<T>(
  key: string,
  handler: () => Promise<T>,
  options?: AsyncDataOptions<T>,
) {
  return useAsyncData<T>(key, handler, {
    ...options,
    getCachedData(k, nuxtApp) {
      if (import.meta.server || nuxtApp.isHydrating) {
        return nuxtApp.payload.data[k] as T | undefined
      }
      return undefined
    },
  })
}
