type SlugRow = { slug: string; updatedAt: string }

const BACKEND = process.env.NUXT_API_INTERNAL_URL || 'http://localhost:3000'

export default defineEventHandler(async () => {
  const res = await $fetch<{ slugs: SlugRow[] }>(`${BACKEND}/api/public/sitemap/movies`)
  return res.slugs.map((row) => ({
    loc: `/nep-akarata/${row.slug}`,
    lastmod: row.updatedAt,
  }))
})
