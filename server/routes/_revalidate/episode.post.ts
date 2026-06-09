export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const backend = config.apiInternalUrl || config.public.apiBaseUrl
  const cookie = getRequestHeader(event, 'cookie') ?? ''

  try {
    await $fetch(`${backend}/api/auth/me`, {
      headers: { cookie, accept: 'application/json' },
    })
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const storage = useStorage('cache')
  const keys = await storage.getKeys('nitro:routes:')

  await Promise.all(keys.map((key) => storage.removeItem(key)))

  return { cleared: keys.length }
})
