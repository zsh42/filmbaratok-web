<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import type VanillaTiltModule from 'vanilla-tilt'
import { listPublicEpisodes } from '~/composables/api/episodes'
import { ApiError } from '~/composables/api/client'
import type { Episode } from '@/types/episode'
import youtubeIcon from '@/assets/icons/youtube-icon.svg'
import soundcloudIcon from '@/assets/icons/soundcloud.svg'
import appleIcon from '@/assets/icons/apple-icon.svg'
import patreonIcon from '@/assets/icons/patreon.svg'
import facebookIcon from '@/assets/icons/facebook.svg'
import blogIcon from '@/assets/icons/blog.svg'

definePageMeta({ layout: 'default' })
useSeoMeta({
  title: 'Kezdőlap – filmbarátok',
  description:
    'A filmbarátok podcast epizódjainak listája. Filmes vélemények, ajánlók és közös szavazások.',
  ogTitle: 'filmbarátok – Epizódok',
  ogDescription:
    'A filmbarátok podcast epizódjainak listája. Filmes vélemények, ajánlók és közös szavazások.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

interface SocialLink {
  name: string
  href: string
  icon: string
  color: string
  textColor?: string
}

const socialLinks: SocialLink[] = [
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@FilmbaratokPodcast',
    icon: youtubeIcon,
    color: '#FF003399',
    textColor: '#ffffff',
  },
  {
    name: 'SoundCloud',
    href: 'https://soundcloud.com/filmbaratokpodcast',
    icon: soundcloudIcon,
    color: '#FF550099',
    textColor: '#ffffff',
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=100032362197012',
    icon: facebookIcon,
    color: '#1877F299',
    textColor: '#ffffff',
  },
  {
    name: 'Apple Podcasts',
    href: 'https://podcasts.apple.com/hu/podcast/filmbar%C3%A1tok-podcast/id1165929483',
    icon: appleIcon,
    color: '#9933CC99',
    textColor: '#ffffff',
  },
  {
    name: 'Patreon',
    href: 'https://www.patreon.com/filmbaratok',
    icon: patreonIcon,
    color: '#00000099',
    textColor: '#ffffff',
  },
  {
    name: 'Blog',
    href: 'https://filmbaratok.blog.hu/',
    icon: blogIcon,
    color: '#E6001299',
    textColor: '#ffffff',
  },
]

const pageSize = ref(12)
const searchInput = ref('')
const search = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

const CAROUSEL_SIZE = 12

const { data: initialData } = await useFreshAsyncData('public-episodes', () =>
  listPublicEpisodes({ page: 1, pageSize: pageSize.value }),
)

const { data: expresszData } = await useFreshAsyncData('public-episodes-tag-1', () =>
  listPublicEpisodes({ page: 1, pageSize: CAROUSEL_SIZE, tagId: 1 }),
)

const { data: podcastData } = await useFreshAsyncData('public-episodes-tag-7', () =>
  listPublicEpisodes({ page: 1, pageSize: CAROUSEL_SIZE, tagId: 7 }),
)

const { data: audiokommentarData } = await useFreshAsyncData('public-episodes-tag-2', () =>
  listPublicEpisodes({ page: 1, pageSize: CAROUSEL_SIZE, tagId: 2 }),
)

const episodes = ref<Episode[]>(initialData.value?.episodes ?? [])
const total = ref(initialData.value?.total ?? 0)
const page = ref(initialData.value?.page ?? 1)

const expresszEpisodes = computed<Episode[]>(() => expresszData.value?.episodes ?? [])
const podcastEpisodes = computed<Episode[]>(() => podcastData.value?.episodes ?? [])
const audiokommentarEpisodes = computed<Episode[]>(() => audiokommentarData.value?.episodes ?? [])

const heroEpisode = computed<Episode | null>(() => initialData.value?.episodes?.[0] ?? null)

const heroParticipantString = computed(
  () => heroEpisode.value?.participants?.map((p) => p.name).join(' – ') ?? '',
)

const heroWatchUrl = computed(() =>
  heroEpisode.value?.videoId
    ? `https://www.youtube.com/watch?v=${heroEpisode.value.videoId}`
    : null,
)

const heroPublishedLong = computed(() => {
  const value = heroEpisode.value?.publishedAt
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
})

const heroSlugLink = computed(() =>
  heroEpisode.value ? `/epizodok/${heroEpisode.value.slug}` : '/',
)

const siteUrl = useSiteConfig().url

useHead(
  computed(() => ({
    script: [
      {
        type: 'application/ld+json',
        key: 'schema-episodes',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'filmbarátok – Epizódok',
          numberOfItems: total.value,
          itemListElement: episodes.value.map((ep, i) => ({
            '@type': 'ListItem',
            position: (page.value - 1) * pageSize.value + i + 1,
            name: ep.title,
            url: `${siteUrl}/epizodok/${ep.slug}`,
          })),
        }),
      },
    ],
  })),
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await listPublicEpisodes({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value || null,
    })
    episodes.value = res.episodes
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = `Hiba a lekérdezés során (${err.status}).`
    } else {
      error.value = 'Hiba a lekérdezés során.'
    }
    episodes.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function applySearch() {
  search.value = searchInput.value.trim()
  page.value = 1
  load()
}

function clearSearch() {
  searchInput.value = ''
  applySearch()
}

function onPage(event: { page: number; rows: number }) {
  page.value = event.page + 1
  pageSize.value = event.rows
  load()
  document
    .querySelector('.episodes-list-section')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const carouselResponsiveOptions = ref([
  { breakpoint: '1400px', numVisible: 4, numScroll: 1 },
  { breakpoint: '1100px', numVisible: 3, numScroll: 1 },
  { breakpoint: '768px', numVisible: 2, numScroll: 1 },
  { breakpoint: '480px', numVisible: 1, numScroll: 1 },
])

type TiltElement = HTMLElement & { vanillaTilt?: { destroy(): void } }

const tiltEnabled = ref(false)
let tiltMq: MediaQueryList | null = null
let VanillaTilt: typeof VanillaTiltModule | null = null

function destroyTilt() {
  document.querySelectorAll<TiltElement>('.episode-card.tilt-active').forEach((el) => {
    el.vanillaTilt?.destroy()
    el.classList.remove('tilt-active')
  })
}

function applyTilt() {
  if (!tiltEnabled.value || !VanillaTilt) return
  document.querySelectorAll<TiltElement>('.episode-card:not(.tilt-active)').forEach((el) => {
    VanillaTilt!.init(el, {
      max: 2,
      speed: 400,
      scale: 1.04,
      perspective: 1000,
      glare: true,
      'max-glare': 0.1,
      transition: true,
    })
    el.classList.add('tilt-active')
  })
}

async function refreshTilt() {
  await nextTick()
  destroyTilt()
  applyTilt()
}

async function onTiltMqChange(e: MediaQueryListEvent) {
  tiltEnabled.value = e.matches
  if (e.matches) {
    if (!VanillaTilt) VanillaTilt = (await import('vanilla-tilt')).default
    refreshTilt()
  } else {
    destroyTilt()
  }
}

watch(episodes, refreshTilt)
watch([expresszEpisodes, podcastEpisodes, audiokommentarEpisodes], refreshTilt)

onMounted(async () => {
  tiltMq = window.matchMedia('(hover: hover) and (pointer: fine)')
  tiltEnabled.value = tiltMq.matches
  tiltMq.addEventListener('change', onTiltMqChange)
  if (tiltEnabled.value) {
    VanillaTilt = (await import('vanilla-tilt')).default
  }
  await refreshTilt()
})

onBeforeUnmount(() => {
  tiltMq?.removeEventListener('change', onTiltMqChange)
  destroyTilt()
})
</script>

<template>
  <section class="home">
    <div class="social-row">
      <a
        v-for="link in socialLinks"
        :key="link.name"
        :href="link.href"
        target="_blank"
        rel="noopener noreferrer"
        class="social-pill"
        :style="{ '--pill-bg': link.color, '--pill-fg': link.textColor || '#fff' }"
        :aria-label="link.name"
      >
        <img
          :src="link.icon"
          alt=""
          class="social-pill-icon"
          style="width: 1.25rem; height: 1.25rem; flex: 0 0 1.25rem"
          aria-hidden="true"
        />
        <span class="social-pill-label">{{ link.name }}</span>
      </a>
    </div>

    <section v-if="heroEpisode" class="hero" aria-label="Legújabb epizód">
      <NuxtImg
        v-if="heroEpisode.image"
        class="hero-bg"
        :src="heroEpisode.image"
        alt=""
        width="1400"
        height="788"
        sizes="100vw md:1400px"
        preload
        fetchpriority="high"
      />
      <div class="hero-scrim" />

      <div class="hero-content">
        <span class="hero-eyebrow">Legújabb epizód</span>
        <h1 class="hero-title">{{ heroEpisode.title }}</h1>

        <div v-if="heroParticipantString" class="hero-participants">
          <span>{{ heroParticipantString }}</span>
        </div>

        <div v-if="heroPublishedLong" class="hero-meta">
          <span class="meta-item">
            <i class="pi pi-calendar" aria-hidden="true" />
            {{ heroPublishedLong }}
          </span>
        </div>

        <div class="hero-actions">
          <NuxtLink :to="heroSlugLink" class="primary-action">
            <i class="pi pi-play-circle" />
            <span>Részletek</span>
          </NuxtLink>

          <a
            v-if="heroWatchUrl"
            :href="heroWatchUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="icon-action"
            aria-label="Megnézés YouTube-on"
            v-tooltip.bottom="'YouTube'"
          >
            <i class="pi pi-youtube" />
          </a>

          <a
            v-if="heroEpisode.soundcloudUrl"
            :href="heroEpisode.soundcloudUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="icon-action"
            aria-label="SoundCloud-on hallgatás"
            v-tooltip.bottom="'SoundCloud'"
          >
            <i class="pi pi-volume-up" />
          </a>

          <a
            v-if="heroEpisode.downloadUrl"
            :href="heroEpisode.downloadUrl"
            target="_blank"
            rel="noopener noreferrer"
            download
            class="icon-action"
            aria-label="Letöltés"
            v-tooltip.bottom="'Letöltés'"
          >
            <i class="pi pi-download" />
          </a>
        </div>
      </div>
    </section>

    <section v-if="expresszEpisodes.length" class="carousel-row" aria-label="Filmbarátok Expressz">
      <h2 class="row-title">Filmbarátok Expressz</h2>
      <Carousel
        v-if="expresszEpisodes.length > 4"
        :value="expresszEpisodes"
        :numVisible="4"
        :numScroll="1"
        :responsiveOptions="carouselResponsiveOptions"
        :showIndicators="false"
      >
        <template #item="slotProps">
          <EpisodeCard :episode="slotProps.data" class="carousel-card" />
        </template>
      </Carousel>
      <div v-else class="static-row">
        <EpisodeCard v-for="ep in expresszEpisodes" :key="ep.id" :episode="ep" />
      </div>
    </section>

    <section v-if="podcastEpisodes.length" class="carousel-row" aria-label="Filmbarátok Podcast">
      <h2 class="row-title">Filmbarátok Podcast</h2>
      <Carousel
        v-if="podcastEpisodes.length > 4"
        :value="podcastEpisodes"
        :numVisible="4"
        :numScroll="1"
        :responsiveOptions="carouselResponsiveOptions"
        :showIndicators="false"
      >
        <template #item="slotProps">
          <EpisodeCard :episode="slotProps.data" class="carousel-card" />
        </template>
      </Carousel>
      <div v-else class="static-row">
        <EpisodeCard v-for="ep in podcastEpisodes" :key="ep.id" :episode="ep" />
      </div>
    </section>

    <section
      v-if="audiokommentarEpisodes.length"
      class="carousel-row"
      aria-label="Audiokommentárok"
    >
      <h2 class="row-title">Audiokommentárok</h2>
      <Carousel
        v-if="audiokommentarEpisodes.length > 4"
        :value="audiokommentarEpisodes"
        :numVisible="4"
        :numScroll="1"
        :responsiveOptions="carouselResponsiveOptions"
        :showIndicators="false"
      >
        <template #item="slotProps">
          <EpisodeCard :episode="slotProps.data" class="carousel-card" />
        </template>
      </Carousel>
      <div v-else class="static-row">
        <EpisodeCard v-for="ep in audiokommentarEpisodes" :key="ep.id" :episode="ep" />
      </div>
    </section>

    <section class="episodes-list-section">
      <header class="page-header">
        <h2>Összes epizód</h2>
      </header>

      <div class="toolbar">
        <IconField class="search">
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchInput" placeholder="Keresés…" @keyup.enter="applySearch" />
          <InputIcon v-if="searchInput" class="pi pi-times clear-icon" @click="clearSearch" />
        </IconField>
        <Button label="Keresés" icon="pi pi-search" @click="applySearch" />
      </div>

      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

      <DataView
        :value="episodes"
        :loading="loading"
        layout="grid"
        lazy
        paginator
        :rows="pageSize"
        :total-records="total"
        :first="(page - 1) * pageSize"
        :rows-per-page-options="[6, 12, 24, 48]"
        data-key="id"
        paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
        current-page-report-template="{first}–{last} / {totalRecords}"
        @page="onPage"
      >
        <template #grid="{ items }">
          <div class="episode-grid">
            <EpisodeCard v-for="ep in items" :key="ep.id" :episode="ep" />
          </div>
        </template>

        <template #empty>
          <div class="empty">Nincs találat.</div>
        </template>
      </DataView>
    </section>
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* ===== Social row ===== */
.social-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.6rem;
}

.social-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.7rem 1rem;
  border-radius: 0.65rem;
  background: var(--pill-bg);
  color: var(--pill-fg);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 14px -8px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.15s,
    filter 0.15s,
    box-shadow 0.2s;
  min-width: 0;
}

.social-pill:hover,
.social-pill:focus-visible {
  transform: translateY(-2px);
  filter: brightness(1.2);
  box-shadow: 0 10px 22px -10px rgba(0, 0, 0, 0.45);
}

.social-pill-icon {
  width: 1.1rem;
  height: 1.1rem;
  object-fit: contain;
  flex-shrink: 0;
  /* border-radius: 50%; */
}

.social-pill-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 900px) {
  .social-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 480px) {
  .social-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  .social-pill {
    padding: 0.6rem 0.7rem;
    font-size: 0.8rem;
  }
  .social-pill-label {
    font-size: 0.78rem;
  }
}

/* ===== Hero ===== */
.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100vw;
  max-width: 1400px;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  min-height: clamp(24rem, 56vh, 38rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 4rem 1.5rem 5rem;
  color: #fff;
  background: #08080d;
  border-radius: 0;
}

@media (hover: hover) and (pointer: fine) {
  .hero:has(.hero-actions:hover) .hero-bg {
    scale: 1.1;
    filter: blur(2px);
  }
}

@media (min-width: 1400px) {
  .hero {
    width: 1400px;
    margin-left: calc((100% - 1400px) / 2);
    margin-right: calc((100% - 1400px) / 2);
    border-radius: 1rem;
  }
}

/* .hero::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60%;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--p-content-background) 95%,
    var(--p-content-background) 100%
  );
  z-index: 1;
} */

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition:
    scale 250ms ease-out,
    filter 250ms ease-out;
}

.hero-scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 13, 0.4) 0%,
    rgba(8, 8, 13, 0.2) 30%,
    rgba(8, 8, 13, 0.6) 70%,
    rgba(8, 8, 13, 0.95) 100%
  );
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  max-width: 48rem;
  text-align: center;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.hero-title {
  margin: 0;
  font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif;
  font-weight: 400;
  font-size: clamp(2rem, 4.5vw, 3.75rem);
  line-height: 1.05;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.55);
}

.hero-participants {
  font-size: clamp(0.9rem, 1.4vw, 1.05rem);
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 0.02em;
  font-style: italic;
  text-align: center;
  max-width: 40rem;
  line-height: 1.4;
}

.hero-meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.78);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-variant-numeric: tabular-nums;
}

.meta-item i {
  font-size: 0.9rem;
  opacity: 0.7;
}

.hero-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.4rem;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 1.4rem;
  border-radius: 999px;
  background: #fff;
  color: #0c0c14;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.2s,
    background-color 0.2s;
  box-shadow: 0 6px 18px -6px rgba(0, 0, 0, 0.55);
}

.primary-action:hover,
.primary-action:focus-visible {
  transform: translateY(-1px);
  background: #f6f6f9;
  box-shadow: 0 10px 22px -8px rgba(0, 0, 0, 0.6);
}

.primary-action i {
  font-size: 1.2rem;
}

.icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.15s,
    border-color 0.2s;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.icon-action:hover,
.icon-action:focus-visible {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.24);
  transform: translateY(-1px);
}

.icon-action i {
  font-size: 1.05rem;
}

@media (max-width: 640px) {
  .hero {
    min-height: clamp(20rem, 60vh, 28rem);
    padding: 3rem 1rem 4.5rem;
  }
  .hero-content {
    gap: 0.7rem;
  }
  .primary-action {
    padding: 0.6rem 1.15rem;
    font-size: 0.9rem;
  }
  .icon-action {
    width: 2.4rem;
    height: 2.4rem;
  }
}

/* ===== Carousel rows ===== */
.carousel-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.row-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.carousel-row :deep(.p-carousel-item) {
  padding: 0.5rem 0.4rem;
  box-sizing: border-box;
}

.carousel-row :deep(.p-carousel-content) {
  align-items: stretch;
}

.carousel-card {
  height: 100%;
}

/* ===== Episodes list (paginated) ===== */
.episodes-list-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scroll-margin-top: 1rem;
}

.page-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}

.toolbar {
  display: flex;
  gap: 0.6rem;
  align-items: stretch;
  flex-wrap: wrap;
}

.search {
  flex: 1 1 240px;
  max-width: 480px;
  min-width: 0;
}

.search :deep(.p-inputtext) {
  width: 100%;
  border-radius: 999px;
  padding-block: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  box-shadow: 0 4px 14px -8px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.15s,
    border-color 0.15s,
    box-shadow 0.2s;
}

.search :deep(.p-inputtext:hover),
.search :deep(.p-inputtext:focus) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px -10px rgba(0, 0, 0, 0.45);
}

.clear-icon {
  cursor: pointer;
  pointer-events: auto;
}

.toolbar :deep(.p-button) {
  border-radius: 999px;
  padding: 0.7rem 1.4rem;
  background: #fff;
  color: #0c0c14;
  border: none;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
  box-shadow: 0 6px 18px -6px rgba(0, 0, 0, 0.55);
  transition:
    transform 0.15s,
    box-shadow 0.2s,
    background-color 0.2s;
}

.toolbar :deep(.p-button:hover),
.toolbar :deep(.p-button:focus-visible) {
  transform: translateY(-1px);
  background: #f6f6f9;
  color: #0c0c14;
  box-shadow: 0 10px 22px -8px rgba(0, 0, 0, 0.6);
}

@media (max-width: 480px) {
  .toolbar :deep(.p-button) {
    padding: 0.6rem 1.15rem;
    font-size: 0.9rem;
  }
}

.episode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
}

.static-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.8rem;
}

@media (max-width: 1100px) {
  .static-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .static-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .static-row {
    grid-template-columns: 1fr;
  }
}

.empty {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

@media (max-width: 480px) {
  .page-header h2 {
    font-size: clamp(1rem, 5vw, 1.25rem);
  }
}
</style>
