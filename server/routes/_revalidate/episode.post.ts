export default defineEventHandler(async (event) => {
  const { revalidateSecret } = useRuntimeConfig()

  if (!revalidateSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Revalidation not configured' })
  }

  const auth = getRequestHeader(event, 'authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (provided !== revalidateSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const storage = useStorage('cache')
  const keys = await storage.getKeys('nitro:routes:')

  await Promise.all(keys.map((key) => storage.removeItem(key)))

  return { cleared: keys.length }
})
