<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type VanillaTiltModule from 'vanilla-tilt'
import { getPublicMovieBySlug } from '~/composables/api/movies'
import { ApiError } from '~/composables/api/client'

definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const siteUrl = useSiteConfig().url

const { data } = await useFreshAsyncData(`movie-${slug.value}`, async () => {
  try {
    return await getPublicMovieBySlug(slug.value)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null
    }
    throw err
  }
})

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Film nem található', fatal: true })
}

const movie = computed(() => data.value!.movie)
const displayTitle = computed(() => movie.value.title || movie.value.imdbId)
const pageUrl = computed(() => `${siteUrl}/nep-akarata/${movie.value.slug}`)

const shortDescription = computed(() => {
  const text = movie.value.plot || ''
  if (text.length <= 160) return text
  return text.slice(0, 157).replace(/\s+\S*$/, '') + '…'
})

useSeoMeta({
  title: `${displayTitle.value} – A Nép akarata – filmbarátok`,
  description:
    shortDescription.value ||
    `${displayTitle.value} — a filmbarátok Nép akarata szavazásán szereplő film.`,
  ogTitle: displayTitle.value,
  ogDescription:
    shortDescription.value ||
    `${displayTitle.value} — a filmbarátok Nép akarata szavazásán szereplő film.`,
  ogType: 'video.movie',
  ogImage: movie.value.poster || undefined,
  ogUrl: pageUrl.value,
  twitterCard: 'summary_large_image',
})

useHead(
  computed(() => ({
    link: [{ rel: 'canonical', href: pageUrl.value }],
    script: [
      {
        type: 'application/ld+json',
        key: 'schema-movie',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Movie',
          name: displayTitle.value,
          description: shortDescription.value || undefined,
          image: movie.value.poster || undefined,
          genre: movie.value.genre || undefined,
          director: movie.value.director
            ? { '@type': 'Person', name: movie.value.director }
            : undefined,
          actor: movie.value.actors
            ? movie.value.actors
                .split(',')
                .map(n => n.trim())
                .filter(Boolean)
                .map(name => ({ '@type': 'Person', name }))
            : undefined,
          duration: movie.value.runtime || undefined,
          datePublished: movie.value.year || undefined,
          aggregateRating: movie.value.imdbRating
            ? {
                '@type': 'AggregateRating',
                ratingValue: movie.value.imdbRating,
                bestRating: '10',
                ratingCount: 1,
              }
            : undefined,
          sameAs: movie.value.imdbUrl || undefined,
        }),
      },
      {
        type: 'application/ld+json',
        key: 'schema-breadcrumb',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Kezdőlap', item: `${siteUrl}/` },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'A Nép akarata',
              item: `${siteUrl}/nep-akarata`,
            },
            { '@type': 'ListItem', position: 3, name: displayTitle.value, item: pageUrl.value },
          ],
        }),
      },
    ],
  })),
)

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('hu-HU')
}

const posterRef = ref<HTMLElement | null>(null)
const posterBroken = ref(false)
type TiltElement = HTMLElement & { vanillaTilt?: { destroy(): void } }
let tiltMq: MediaQueryList | null = null
let VanillaTilt: typeof VanillaTiltModule | null = null

async function ensureTiltLoaded() {
  if (!VanillaTilt) VanillaTilt = (await import('vanilla-tilt')).default
}

async function initPosterTilt() {
  const el = posterRef.value as TiltElement | null
  if (!el || !tiltMq?.matches) return
  await ensureTiltLoaded()
  if (!VanillaTilt || posterRef.value !== el) return
  VanillaTilt.init(el, {
    max: 6,
    speed: 400,
    scale: 1.05,
    perspective: 1000,
    reverse: true,
    glare: true,
    'max-glare': 0.3,
    transition: true,
  })
}

function destroyPosterTilt() {
  const el = posterRef.value as TiltElement | null
  el?.vanillaTilt?.destroy()
}

function onTiltMqChange(e: MediaQueryListEvent) {
  if (e.matches) initPosterTilt()
  else destroyPosterTilt()
}

watch(posterRef, el => {
  if (el) initPosterTilt()
  else destroyPosterTilt()
})

onMounted(() => {
  tiltMq = window.matchMedia('(hover: hover) and (pointer: fine)')
  tiltMq.addEventListener('change', onTiltMqChange)
  initPosterTilt()
})

onBeforeUnmount(() => {
  tiltMq?.removeEventListener('change', onTiltMqChange)
  destroyPosterTilt()
})
</script>

<template>
  <article class="movie-page">
    <nav class="breadcrumb" aria-label="Útvonal">
      <NuxtLink to="/nep-akarata" class="breadcrumb-link">
        <i class="pi pi-arrow-left" />
        <span>A Nép akarata</span>
      </NuxtLink>
    </nav>

    <header class="movie-header">
      <h1 class="movie-title">{{ displayTitle }}</h1>
      <div v-if="movie.year || movie.runtime || movie.genre" class="movie-subtitle">
        <span v-if="movie.year">{{ movie.year }}</span>
        <span v-if="movie.runtime">{{ movie.runtime }}</span>
        <span v-if="movie.genre">{{ movie.genre }}</span>
      </div>
    </header>

    <div class="movie-body">
      <div ref="posterRef" class="detail-poster">
        <NuxtImg
          v-if="movie.poster && !posterBroken"
          :src="movie.poster"
          :alt="displayTitle"
          class="detail-poster-img"
          width="400"
          height="600"
          sizes="xs:100vw sm:50vw md:200px"
          preload
          fetchpriority="high"
          @error="posterBroken = true"
        />
        <div v-else class="no-poster-large">
          <i class="pi pi-image" />
          <span>Nincs poszter</span>
        </div>
      </div>

      <div class="detail-meta">
        <div v-if="movie.imdbRating" class="meta-row">
          <span class="meta-label">IMDB értékelés</span>
          <span class="rating-value">
            <i class="pi pi-star-fill rating-icon" /> {{ movie.imdbRating }}
          </span>
        </div>
        <div v-if="movie.director" class="meta-row">
          <span class="meta-label">Rendező</span>
          <span>{{ movie.director }}</span>
        </div>
        <div v-if="movie.actors" class="meta-row">
          <span class="meta-label">Szereplők</span>
          <span>{{ movie.actors }}</span>
        </div>
        <div v-if="movie.pickedAt" class="meta-row">
          <span class="meta-label">Kisorsolt</span>
          <span>{{ formatDate(movie.pickedAt) }}</span>
        </div>
        <div v-if="movie.plot" class="meta-row plot">
          <span class="meta-label">Leírás</span>
          <span>{{ movie.plot }}</span>
        </div>
        <div class="meta-row">
          <a :href="movie.imdbUrl" target="_blank" rel="noopener noreferrer">
            <Button label="Megnyitás IMDB-n" icon="pi pi-external-link" size="small" text />
          </a>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.movie-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 56rem;
  margin: 0 auto;
}

.breadcrumb {
  font-size: 0.9rem;
}

.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--p-text-muted-color);
  text-decoration: none;
  transition: color 0.15s;
}

.breadcrumb-link:hover {
  color: var(--p-primary-color);
}

.movie-header {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.movie-title {
  margin: 0;
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  line-height: 1.25;
}

.movie-subtitle {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}

.movie-body {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  padding-top: 0.5rem;
}

.detail-poster {
  flex-shrink: 0;
  width: 200px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--p-content-border-color);
  line-height: 0;
}

.detail-poster-img {
  width: 100%;
  display: block;
}

.no-poster-large {
  width: 200px;
  height: 300px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  background: var(--p-content-background);
  border: 1px dashed var(--p-content-border-color);
  border-radius: 6px;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.no-poster-large i {
  font-size: 2rem;
}

.detail-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.meta-row {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.meta-label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.meta-row.plot span:not(.meta-label) {
  font-size: 0.95rem;
  line-height: 1.5;
}

.rating-value {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.rating-icon {
  color: #f59e0b;
  font-size: 0.95rem;
}

@media (max-width: 640px) {
  .movie-body {
    flex-direction: column;
  }

  .detail-poster,
  .no-poster-large {
    width: 100%;
  }

  .detail-poster-img {
    max-height: 360px;
    object-fit: contain;
  }

  .no-poster-large {
    height: 240px;
  }
}
</style>
