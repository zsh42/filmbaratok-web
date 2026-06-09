<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import type { DataTableRowClickEvent } from 'primevue/datatable'
import { listPublicMovies } from '~/composables/api/movies'
import { ApiError } from '~/composables/api/client'
import type { Movie, MovieStatus } from '@/types/movie'

definePageMeta({ layout: 'default' })
useSeoMeta({
  title: 'A Nép akarata – filmbarátok',
  description: 'A filmbarátok Nép akarata szavazása — a közönség által javasolt és kisorsolt filmek listája.',
  ogTitle: 'A Nép akarata – filmbarátok',
  ogDescription: 'A filmbarátok Nép akarata szavazása — a közönség által javasolt és kisorsolt filmek listája.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const PAGE_SIZE = 50

const statusOptions = [
  { label: 'Még nem kisorsolt', value: 'pending' },
  { label: 'Már kisorsoltak', value: 'picked' },
]

const status = ref<MovieStatus>('pending')
const searchInput = ref('')
const search = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

interface MoviesListingCache {
  movies: Movie[]
  total: number
  loadedPage: number
  status: MovieStatus
  search: string
  searchInput: string
}

const listingMemory = useListingMemory<MoviesListingCache>('nepakarata')

const { data: initialData } = await useAsyncData('public-movies', () =>
  listPublicMovies({ status: status.value, page: 1, pageSize: PAGE_SIZE }),
)

const movies = ref<Movie[]>(initialData.value?.movies ?? [])
const total = ref(initialData.value?.total ?? 0)
const loadedPage = ref(initialData.value?.page ?? 0)

const siteUrl = useSiteConfig().url

useHead(
  computed(() => ({
    script: [
      {
        type: 'application/ld+json',
        key: 'schema-movies',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'A Nép akarata – filmek',
          numberOfItems: total.value,
          itemListElement: movies.value.map((movie, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: movie.title || movie.imdbId,
            url: `${siteUrl}/nep-akarata/${movie.slug}`,
          })),
        }),
      },
    ],
  })),
)

const router = useRouter()
const brokenPosters = ref(new Set<string | number>())

const hasMore = computed(() => loadedPage.value === 0 || movies.value.length < total.value)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let loadToken = 0

function onPosterError(id: string | number) {
  brokenPosters.value.add(id)
}

async function loadMore() {
  if (loading.value || !hasMore.value) return
  const nextPage = loadedPage.value + 1
  const token = ++loadToken
  loading.value = true
  error.value = null
  try {
    const res = await listPublicMovies({
      status: status.value,
      page: nextPage,
      pageSize: PAGE_SIZE,
      search: search.value || null,
    })
    if (token !== loadToken) return
    movies.value = nextPage === 1 ? res.movies : [...movies.value, ...res.movies]
    total.value = res.total
    loadedPage.value = nextPage
  } catch (err) {
    if (token !== loadToken) return
    if (err instanceof ApiError) {
      error.value = `Hiba a lekérdezés során (${err.status}).`
    } else {
      error.value = 'Hiba a lekérdezés során.'
    }
    if (nextPage === 1) {
      movies.value = []
      total.value = 0
    }
  } finally {
    if (token === loadToken) loading.value = false
  }
}

function reset() {
  loadToken++
  movies.value = []
  total.value = 0
  loadedPage.value = 0
  loading.value = false
  listingMemory.clear()
  loadMore()
}

function onStatusChange() {
  reset()
}

function applySearch() {
  search.value = searchInput.value.trim()
  reset()
}

function clearSearch() {
  searchInput.value = ''
  applySearch()
}

function onRowClick(event: DataTableRowClickEvent) {
  const target = event.originalEvent.target as HTMLElement | null
  if (target?.closest('a')) return
  router.push(`/nep-akarata/${(event.data as Movie).slug}`)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('hu-HU')
}

watch(sentinel, (el, _prev, onCleanup) => {
  observer?.disconnect()
  observer = null
  if (!el) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore()
    },
    { rootMargin: '400px 0px' },
  )
  observer.observe(el)
  onCleanup(() => {
    observer?.disconnect()
    observer = null
  })
})

const route = useRoute()

onMounted(() => {
  const cached = listingMemory.read()
  if (cached && cached.movies?.length) {
    movies.value = cached.movies
    total.value = cached.total
    loadedPage.value = cached.loadedPage
    status.value = cached.status
    search.value = cached.search
    searchInput.value = cached.searchInput
    loading.value = false
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo(0, cached.scrollY))
    })
    listingMemory.setLastUrl(route.fullPath)
    return
  }
  listingMemory.setLastUrl(route.fullPath)
  if (movies.value.length === 0) loadMore()
})

onBeforeRouteLeave(() => {
  listingMemory.save({
    movies: movies.value,
    total: total.value,
    loadedPage: loadedPage.value,
    status: status.value,
    search: search.value,
    searchInput: searchInput.value,
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <section class="movies">
    <header class="page-header">
      <h2>A Nép akarata</h2>
    </header>

    <div class="toolbar">
      <SelectButton
        v-model="status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        @change="onStatusChange"
      />
      <div class="search-wrap">
        <IconField class="search">
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchInput" placeholder="Keresés…" @keyup.enter="applySearch" />
          <InputIcon v-if="searchInput" class="pi pi-times clear-icon" @click="clearSearch" />
        </IconField>
        <Button label="Keresés" icon="pi pi-search" @click="applySearch" />
      </div>
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div class="table-wrapper">
      <div v-if="loading && movies.length === 0" class="movies-skeleton-list">
        <MovieRowSkeleton v-for="n in 8" :key="n" />
      </div>

      <DataTable
        v-else
        :value="movies"
        data-key="id"
        striped-rows
        responsive-layout="scroll"
        @row-click="onRowClick"
      >
        <template #empty>
          <div class="empty">Nincs találat.</div>
        </template>

        <Column header="Poszter" style="width: 80px">
          <template #body="{ data }">
            <NuxtImg
              v-if="data.poster && !brokenPosters.has(data.id)"
              :src="data.poster"
              :alt="data.title || data.imdbId"
              class="poster-thumb"
              width="50"
              height="74"
              loading="lazy"
              @error="onPosterError(data.id)"
            />
            <div v-else class="poster-thumb poster-fallback" aria-label="Nincs poszter">
              <i class="pi pi-image" />
            </div>
          </template>
        </Column>

        <Column field="title" header="Cím">
          <template #body="{ data }">
            <NuxtLink :to="`/nep-akarata/${data.slug}`" class="title-link">
              {{ data.title || data.imdbId }}
            </NuxtLink>
          </template>
        </Column>

        <Column
          field="year"
          header="Év"
          style="width: 6rem"
          header-class="hide-on-mobile"
          body-class="hide-on-mobile"
        />

        <Column header="IMDB" style="width: 8rem">
          <template #body="{ data }">
            <span v-if="data.imdbRating" class="rating">
              <i class="pi pi-star-fill rating-icon" />
              {{ data.imdbRating }}
            </span>
            <span v-else>–</span>
          </template>
        </Column>

        <Column v-if="status === 'picked'" header="Kisorsolt" style="width: 10rem">
          <template #body="{ data }">{{ formatDate(data.pickedAt) }}</template>
        </Column>
      </DataTable>

      <div
        v-if="hasMore && !error"
        ref="sentinel"
        class="scroll-sentinel"
        aria-hidden="true"
      >
        <div v-if="loading && movies.length > 0" class="movies-skeleton-loader">
          <MovieRowSkeleton v-for="n in 3" :key="n" />
        </div>
      </div>
      <div v-else-if="movies.length > 0 && !error" class="list-footer">
        {{ total }} találat
      </div>
    </div>

  </section>
</template>

<style scoped>
.movies {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

:deep(.p-datatable-tbody > tr) {
  cursor: pointer;
  transition: background-color 0.12s ease;
}

/* Only apply hover styles on devices that actually support hover —
 * on touch devices the :hover state sticks after tap and lingers
 * after closing a dialog opened by tapping the row. */
@media (hover: hover) and (pointer: fine) {
  :deep(.p-datatable-tbody > tr:hover) {
    background: var(--p-content-hover-background, rgba(0, 0, 0, 0.04));
  }
}

.page-header h2 {
  margin: 0;
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrap {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  margin-left: auto;
}

.search {
  flex: 1 1 200px;
  max-width: 360px;
  min-width: 0;
}

.search :deep(input) {
  width: 100%;
}

.clear-icon {
  cursor: pointer;
  pointer-events: auto;
}

.poster-thumb {
  width: 50px;
  height: auto;
  border-radius: 4px;
  display: block;
}

.poster-fallback {
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-content-background);
  border: 1px dashed var(--p-content-border-color);
  color: var(--p-text-muted-color);
}

.poster-fallback i {
  font-size: 1.3rem;
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.rating-icon {
  color: #f59e0b;
  font-size: 0.85rem;
}

.empty {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

.title-link {
  color: inherit;
  text-decoration: none;
}

.title-link:hover {
  color: var(--p-primary-color);
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

.movies-skeleton-list {
  display: flex;
  flex-direction: column;
}

.movies-skeleton-loader {
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
  width: 100%;
}

.scroll-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3.5rem;
  padding: 0.75rem 0;
}

.list-footer {
  padding: 0.75rem 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 480px) {
  .page-header h2 {
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }

  :deep(.hide-on-mobile) {
    display: none;
  }

  :deep(.p-selectbutton) {
    width: 100%;
    display: flex;
  }

  :deep(.p-selectbutton .p-togglebutton) {
    flex: 1;
    justify-content: center;
  }

  .search-wrap {
    width: 100%;
    margin-left: 0;
  }
}
</style>
