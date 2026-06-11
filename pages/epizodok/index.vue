<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import type VanillaTiltModule from 'vanilla-tilt'
import { listPublicEpisodes } from '~/composables/api/episodes'
import { ApiError } from '~/composables/api/client'
import type { Episode } from '@/types/episode'

definePageMeta({ layout: 'default' })

const TAG_SLUGS = {
  expressz: { id: 1, label: 'Filmbarátok Expressz' },
  podcast: { id: 7, label: 'Filmbarátok Podcast' },
  audiokommentar: { id: 2, label: 'Audiokommentárok' },
} as const

type TagSlug = keyof typeof TAG_SLUGS

const DEFAULT_PAGE_SIZE = 12
const PAGE_SIZE_OPTIONS = [6, 12, 24, 48]

const route = useRoute()
const router = useRouter()

function parsePage(value: unknown): number {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

function parsePageSize(value: unknown): number {
  const n = Number(Array.isArray(value) ? value[0] : value)
  return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE
}

function parseSearch(value: unknown): string {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' ? v : ''
}

function parseTag(value: unknown): TagSlug | null {
  const v = Array.isArray(value) ? value[0] : value
  if (typeof v !== 'string') return null
  return v in TAG_SLUGS ? (v as TagSlug) : null
}

const page = ref(parsePage(route.query.page))
const pageSize = ref(parsePageSize(route.query.pageSize))
const searchInput = ref(parseSearch(route.query.search))
const search = ref(parseSearch(route.query.search))
const tag = ref<TagSlug | null>(parseTag(route.query.tag))
const loading = ref(false)
const error = ref<string | null>(null)

const tagId = computed(() => (tag.value ? TAG_SLUGS[tag.value].id : null))
const headingLabel = computed(() => (tag.value ? TAG_SLUGS[tag.value].label : 'Összes epizód'))

const pageTitle = computed(() =>
  tag.value ? `${TAG_SLUGS[tag.value].label} – filmbarátok` : 'Epizódok – filmbarátok',
)

useSeoMeta({
  title: () => pageTitle.value,
  description:
    'A filmbarátok podcast epizódjainak teljes listája — kereshető, szűrhető Expressz, Podcast és Audiokommentárok között.',
  ogTitle: () => pageTitle.value,
  ogDescription:
    'A filmbarátok podcast epizódjainak teljes listája — kereshető, szűrhető Expressz, Podcast és Audiokommentárok között.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const listingMemory = useListingMemory<{ url: string }>('episodes')

const asyncDataKey = computed(
  () =>
    `public-episodes-list-p${page.value}-s${pageSize.value}-q${search.value}-t${tag.value ?? ''}`,
)

const { data: initialData } = await useAsyncData(asyncDataKey.value, () =>
  listPublicEpisodes({
    page: page.value,
    pageSize: pageSize.value,
    search: search.value || null,
    tagId: tagId.value,
  }),
)

const episodes = ref<Episode[]>(initialData.value?.episodes ?? [])
const total = ref(initialData.value?.total ?? 0)
if (initialData.value?.page) page.value = initialData.value.page
if (initialData.value?.pageSize) pageSize.value = initialData.value.pageSize

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
          name: headingLabel.value,
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

let loadToken = 0

async function load() {
  const token = ++loadToken
  loading.value = true
  error.value = null
  try {
    const res = await listPublicEpisodes({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value || null,
      tagId: tagId.value,
    })
    if (token !== loadToken) return
    episodes.value = res.episodes
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize
  } catch (err) {
    if (token !== loadToken) return
    if (err instanceof ApiError) {
      error.value = `Hiba a lekérdezés során (${err.status}).`
    } else {
      error.value = 'Hiba a lekérdezés során.'
    }
    episodes.value = []
    total.value = 0
  } finally {
    if (token === loadToken) loading.value = false
  }
}

function buildQuery(opts: { page: number; pageSize: number; search: string; tag: TagSlug | null }) {
  const query: Record<string, string> = {}
  if (opts.tag) query.tag = opts.tag
  if (opts.search) query.search = opts.search
  if (opts.page !== 1) query.page = String(opts.page)
  if (opts.pageSize !== DEFAULT_PAGE_SIZE) query.pageSize = String(opts.pageSize)
  return query
}

function applySearch() {
  const next = searchInput.value.trim()
  router.push({
    path: '/epizodok',
    query: buildQuery({ page: 1, pageSize: pageSize.value, search: next, tag: tag.value }),
  })
}

function clearSearch() {
  searchInput.value = ''
  applySearch()
}

function clearTag() {
  router.push({
    path: '/epizodok',
    query: buildQuery({ page: 1, pageSize: pageSize.value, search: search.value, tag: null }),
  })
}

function onPage(event: { page: number; rows: number }) {
  const nextPage = event.page + 1
  const nextSize = event.rows
  router.push({
    path: '/epizodok',
    query: buildQuery({
      page: nextPage,
      pageSize: nextSize,
      search: search.value,
      tag: tag.value,
    }),
  })
  document
    .querySelector('.episodes-list-section')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(
  () => route.query,
  (query) => {
    if (route.path !== '/epizodok') return
    const nextPage = parsePage(query.page)
    const nextSize = parsePageSize(query.pageSize)
    const nextSearch = parseSearch(query.search)
    const nextTag = parseTag(query.tag)
    if (
      nextPage === page.value &&
      nextSize === pageSize.value &&
      nextSearch === search.value &&
      nextTag === tag.value
    ) {
      return
    }
    page.value = nextPage
    pageSize.value = nextSize
    search.value = nextSearch
    searchInput.value = nextSearch
    tag.value = nextTag
    load()
  },
)

watch(
  () => route.fullPath,
  (fullPath) => {
    if (route.path === '/epizodok') listingMemory.setLastUrl(fullPath)
  },
  { immediate: true },
)

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

onMounted(async () => {
  // Hydration recovery: Nuxt's per-route _payload.json doesn't include query params,
  // so client hydration may have empty episodes when the URL has ?page/?tag/?search.
  // Re-fetch if the rendered list is empty but the URL implies a non-default query.
  const hasQuery = page.value !== 1 || tag.value !== null || search.value !== ''
  if (hasQuery && episodes.value.length === 0) {
    load()
  }

  const saved = listingMemory.read()
  if (saved && saved.url === route.fullPath && saved.scrollY > 0) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo(0, saved.scrollY))
    })
  }

  tiltMq = window.matchMedia('(hover: hover) and (pointer: fine)')
  tiltEnabled.value = tiltMq.matches
  tiltMq.addEventListener('change', onTiltMqChange)
  if (tiltEnabled.value) {
    VanillaTilt = (await import('vanilla-tilt')).default
  }
  await refreshTilt()
})

onBeforeRouteLeave(() => {
  listingMemory.save({ url: route.fullPath })
})

onBeforeUnmount(() => {
  tiltMq?.removeEventListener('change', onTiltMqChange)
  destroyTilt()
})
</script>

<template>
  <section class="episodes-list-section">
    <header class="page-header">
      <h1>{{ headingLabel }}</h1>
      <button v-if="tag" type="button" class="tag-clear" @click="clearTag">
        <i class="pi pi-times" /> Szuro torlese
      </button>
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
      layout="grid"
      lazy
      paginator
      :rows="pageSize"
      :total-records="total"
      :first="(page - 1) * pageSize"
      :rows-per-page-options="[6, 12, 24, 48]"
      data-key="id"
      paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
      current-page-report-template="{currentPage} / {totalPages}"
      @page="onPage"
    >
      <template #grid="{ items }">
        <div v-if="loading" class="episode-grid">
          <EpisodeCardSkeleton v-for="n in pageSize" :key="`sk-${n}`" />
        </div>
        <div v-else class="episode-grid">
          <EpisodeCard v-for="ep in items" :key="ep.id" :episode="ep" />
        </div>
      </template>

      <template #empty>
        <div class="empty">Nincs találat.</div>
      </template>
    </DataView>
  </section>
</template>

<style scoped>
.episodes-list-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scroll-margin-top: 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif;
  font-weight: 400;
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  letter-spacing: 0.01em;
}

.tag-clear {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--p-text-color);
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    background-color 0.15s,
    border-color 0.15s;
}

.tag-clear:hover,
.tag-clear:focus-visible {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.2);
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

.empty {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}
</style>
