<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import {
  listMovies,
  addMovie,
  pickMovie,
  deleteMovie,
  importMovies,
  enrichMissingMovies,
} from '~/composables/api/movies'
import { useAuthStore } from '~/stores/auth'
import { ApiError } from '~/composables/api/client'
import type { Movie, MovieStatus } from '@/types/movie'

definePageMeta({ layout: 'admin', ssr: false, middleware: ['auth'] })
useSeoMeta({ title: 'A Nép akarata – filmbarátok' })

const toast = useToast()
const confirm = useConfirm()
const auth = useAuthStore()

const PAGE_SIZE = 50

const statusOptions = [
  { label: 'Még nem kisorsolt', value: 'pending' },
  { label: 'Már kisorsoltak', value: 'picked' },
]

const status = ref<MovieStatus>('pending')
const movies = ref<Movie[]>([])
const total = ref(0)
const loadedPage = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const picking = ref(false)
const adding = ref(false)
const importing = ref(false)
const enriching = ref(false)
const searchInput = ref('')
const search = ref('')

const selectedMovie = ref<Movie | null>(null)
const detailDialogOpen = ref(false)
const addDialogOpen = ref(false)
const newImdbUrl = ref('')
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
    const res = await listMovies({
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
  return loadMore()
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

function onPick() {
  confirm.require({
    message: `${total.value} film vár sorsolásra. A kisorsolt film átkerül a "Már kisorsoltak" listába és nem vonható vissza. Indulhat?`,
    header: 'Sorsolás indítása',
    icon: 'pi pi-sparkles',
    acceptLabel: 'Sorsolás',
    rejectLabel: 'Mégse',
    accept: doPick,
  })
}

async function fireConfetti() {
  const { default: confetti } = await import('canvas-confetti')
  const filmShapes = ['🎬', '🎥', '🍿', '📽️'].map((text) =>
    confetti.shapeFromText({ text, scalar: 2 }),
  )
  confetti({
    particleCount: 60,
    spread: 150,
    startVelocity: 40,
    origin: { y: 0.35 },
    shapes: filmShapes,
    scalar: 2.4,
    ticks: 120,
    zIndex: 9999,
  })
}

async function doPick() {
  picking.value = true
  try {
    const res = await pickMovie()
    selectedMovie.value = res.movie
    detailDialogOpen.value = true
    fireConfetti()
    await reset()
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      toast.add({ severity: 'info', summary: 'Nincs sorsolható film', life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: 'Hiba', detail: 'Sorsolás sikertelen.', life: 4000 })
    }
  } finally {
    picking.value = false
  }
}

async function onAdd() {
  if (!newImdbUrl.value.trim()) return

  adding.value = true
  try {
    await addMovie(newImdbUrl.value.trim())
    toast.add({ severity: 'success', summary: 'Film hozzáadva', life: 3000 })
    addDialogOpen.value = false
    newImdbUrl.value = ''
    status.value = 'pending'
    await reset()
  } catch (err) {
    let detail = 'Hozzáadás sikertelen.'
    if (err instanceof ApiError) {
      if (err.status === 400) detail = 'Érvénytelen IMDB link.'
      else if (err.status === 409) detail = 'Ez a film már szerepel a listán.'
      else if (err.status === 404) detail = 'Az IMDB ID nem található.'
    }
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    adding.value = false
  }
}

function onDeleteMovie(movie: Movie) {
  confirm.require({
    message: `Biztosan törölni szeretnéd: "${movie.title || movie.imdbId}"?`,
    header: 'Film törlése',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Törlés',
    rejectLabel: 'Mégse',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteMovie(movie.id)
        toast.add({ severity: 'success', summary: 'Törölve', life: 3000 })
        await reset()
      } catch (err) {
        const detail =
          err instanceof ApiError ? `Törlés sikertelen (${err.status}).` : 'Törlés sikertelen.'
        toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
      }
    },
  })
}

function onRowClick(event: { data: Movie }) {
  selectedMovie.value = event.data
  detailDialogOpen.value = true
}

function closeDetailDialog() {
  detailDialogOpen.value = false
  selectedMovie.value = null
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('hu-HU')
}

function openAddDialog() {
  newImdbUrl.value = ''
  addDialogOpen.value = true
}

async function onEnrich() {
  enriching.value = true
  try {
    const res = await enrichMissingMovies()
    if (res.total === 0) {
      toast.add({
        severity: 'info',
        summary: 'Nincs feldúsítandó film',
        detail: 'Minden filmnek van adatlapja.',
        life: 3000,
      })
    } else {
      toast.add({
        severity: 'success',
        summary: 'Feldúsítás elindult',
        detail: `${res.queued} film a háttérben frissül. Frissítsd az oldalt később.`,
        life: 5000,
      })
    }
  } catch (err) {
    const detail =
      err instanceof ApiError && err.status === 400
        ? 'Az OMDB_API_KEY nincs beállítva.'
        : 'Feldúsítás sikertelen.'
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    enriching.value = false
  }
}

function onImport() {
  confirm.require({
    message:
      'Beolvassa az imdb-links.txt fájlt és az új filmeket bekerülnek a listába. Az OMDb feldúsítás háttérben fut. Folytatod?',
    header: 'Import IMDB linkek fájlból',
    icon: 'pi pi-file-import',
    acceptLabel: 'Import',
    rejectLabel: 'Mégse',
    accept: async () => {
      importing.value = true
      try {
        const res = await importMovies()
        toast.add({
          severity: 'success',
          summary: 'Import kész',
          detail: `Új: ${res.newlyAdded}, kihagyva: ${res.skipped}${
            res.enrichmentStarted ? ' — OMDb feldúsítás háttérben fut.' : ''
          }`,
          life: 5000,
        })
        status.value = 'pending'
        await reset()
      } catch (err) {
        let detail = 'Import sikertelen.'
        if (err instanceof ApiError && err.status === 400) {
          detail = 'A fájl nem olvasható.'
        }
        toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
      } finally {
        importing.value = false
      }
    },
  })
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

onMounted(() => {
  loadMore()
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
      <IconField class="search">
        <InputIcon class="pi pi-search" />
        <InputText v-model="searchInput" placeholder="Keresés…" @keyup.enter="applySearch" />
        <InputIcon v-if="searchInput" class="pi pi-times clear-icon" @click="clearSearch" />
      </IconField>
      <Button label="Keresés" icon="pi pi-search" severity="secondary" outlined @click="applySearch" />
      <div class="toolbar-actions">
        <Button
          v-if="status === 'pending'"
          label="Sorsolás"
          icon="pi pi-sparkles"
          size="large"
          class="pick-button"
          :loading="picking"
          :disabled="total === 0"
          @click="onPick"
        />
        <Button
          v-if="auth.user?.permissions?.includes('super_admin')"
          label="Hiányzó adatok pótlása"
          icon="pi pi-sync"
          severity="secondary"
          outlined
          :loading="enriching"
          @click="onEnrich"
        />
        <Button
          v-if="false"
          label="Import fájlból"
          icon="pi pi-file-import"
          severity="secondary"
          outlined
          :loading="importing"
          @click="onImport"
        />
        <Button label="Új film" icon="pi pi-plus" @click="openAddDialog" />
      </div>
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div class="table-wrapper">
      <DataTable
        :value="movies"
        :loading="loading && movies.length === 0"
        data-key="id"
        striped-rows
        responsive-layout="scroll"
        @row-click="onRowClick"
      >
        <template #empty>
          <div class="empty">Nincs film a listán. Adj hozzá egyet a "+ Új film" gombbal.</div>
        </template>

        <Column header="Poszter" style="width: 80px">
          <template #body="{ data }">
            <img
              v-if="data.poster && !brokenPosters.has(data.id)"
              :src="data.poster"
              :alt="data.title || data.imdbId"
              class="poster-thumb"
              @error="onPosterError(data.id)"
            />
            <div v-else class="poster-thumb poster-fallback" aria-label="Nincs poszter">
              <i class="pi pi-image" />
            </div>
          </template>
        </Column>

        <Column field="title" header="Cím">
          <template #body="{ data }">
            {{ data.title || data.imdbId }}
          </template>
        </Column>

        <Column field="year" header="Év" style="width: 6rem" />

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

        <Column header="Műveletek" style="width: 7rem">
          <template #body="{ data }">
            <div class="actions">
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                aria-label="Törlés"
                @click.stop="onDeleteMovie(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <div
        v-if="hasMore && !error"
        ref="sentinel"
        class="scroll-sentinel"
        aria-hidden="true"
      >
        <ProgressSpinner
          v-if="loading && movies.length > 0"
          style="width: 2rem; height: 2rem"
          stroke-width="4"
        />
      </div>
      <div v-else-if="movies.length > 0 && !error" class="list-footer">
        {{ total }} film
      </div>
    </div>

    <Dialog
      v-model:visible="addDialogOpen"
      header="Új film hozzáadása"
      :style="{ width: '32rem' }"
      :breakpoints="{ '640px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
    >
      <div class="add-form">
        <label for="imdb-url">IMDB URL</label>
        <InputText
          id="imdb-url"
          v-model="newImdbUrl"
          placeholder="https://www.imdb.com/title/tt0468569/"
          fluid
          @keyup.enter="onAdd"
        />
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="addDialogOpen = false" />
        <Button
          label="Mentés"
          icon="pi pi-check"
          :loading="adding"
          :disabled="!newImdbUrl.trim()"
          @click="onAdd"
        />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="detailDialogOpen"
      :header="selectedMovie?.title || 'Film'"
      :style="{ width: '50rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
      @hide="closeDetailDialog"
    >
      <div v-if="selectedMovie" class="movie-detail">
        <div class="detail-poster">
          <img
            v-if="selectedMovie.poster && !brokenPosters.has(selectedMovie.id)"
            :src="selectedMovie.poster"
            :alt="selectedMovie.title || selectedMovie.imdbId"
            class="detail-poster-img"
            @error="onPosterError(selectedMovie.id)"
          />
          <div v-else class="no-poster-large">
            <i class="pi pi-image" />
            <span>Nincs poszter</span>
          </div>
        </div>
        <div class="detail-meta">
          <div v-if="selectedMovie.year" class="meta-row">
            <span class="meta-label">Év</span>
            <span>{{ selectedMovie.year }}</span>
          </div>
          <div v-if="selectedMovie.runtime" class="meta-row">
            <span class="meta-label">Hossz</span>
            <span>{{ selectedMovie.runtime }}</span>
          </div>
          <div v-if="selectedMovie.genre" class="meta-row">
            <span class="meta-label">Műfaj</span>
            <span>{{ selectedMovie.genre }}</span>
          </div>
          <div v-if="selectedMovie.imdbRating" class="meta-row">
            <span class="meta-label">IMDB értékelés</span>
            <span><i class="pi pi-star-fill rating-icon" /> {{ selectedMovie.imdbRating }}</span>
          </div>
          <div v-if="selectedMovie.director" class="meta-row">
            <span class="meta-label">Rendező</span>
            <span>{{ selectedMovie.director }}</span>
          </div>
          <div v-if="selectedMovie.actors" class="meta-row">
            <span class="meta-label">Szereplők</span>
            <span>{{ selectedMovie.actors }}</span>
          </div>
          <div v-if="selectedMovie.plot" class="meta-row plot">
            <span class="meta-label">Leírás</span>
            <span>{{ selectedMovie.plot }}</span>
          </div>
          <div class="meta-row">
            <a :href="selectedMovie.imdbUrl" target="_blank" rel="noopener noreferrer">
              <Button label="Megnyitás IMDB-n" icon="pi pi-external-link" size="small" text />
            </a>
          </div>
        </div>
      </div>
    </Dialog>
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

:deep(.p-datatable-tbody > tr:hover) {
  background: var(--p-content-hover-background, rgba(0, 0, 0, 0.04));
}

.page-header h2 {
  margin: 0;
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
  align-items: center;
  flex-wrap: wrap;
}

.search {
  flex: 1 1 200px;
  max-width: 320px;
  min-width: 0;
}

.search :deep(input) {
  width: 100%;
}

.clear-icon {
  cursor: pointer;
  pointer-events: auto;
}

.pick-button.p-button,
.pick-button.p-button:hover,
.pick-button.p-button:focus,
.pick-button.p-button:active {
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.75rem 1.75rem;
  background: linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6);
  background-size: 200% 200%;
  border: none;
  color: white;
  transform: none;
  animation:
    pick-shimmer 4s ease infinite,
    pick-glow 4s ease infinite;
}

.pick-button.p-button:not(:disabled):hover {
  animation:
    pick-shimmer 4s ease infinite,
    pick-glow-hover 4s ease infinite;
}

.pick-button.p-button:disabled {
  background: var(--p-content-background);
  color: var(--p-text-muted-color);
  animation: none;
  box-shadow: none;
}

.pick-button :deep(.p-button-icon) {
  font-size: 1.15rem;
}

@keyframes pick-shimmer {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes pick-glow {
  0% {
    box-shadow: 0 4px 18px rgba(245, 158, 11, 0.55);
  }
  33% {
    box-shadow: 0 4px 22px rgba(239, 68, 68, 0.55);
  }
  66% {
    box-shadow: 0 4px 22px rgba(139, 92, 246, 0.55);
  }
  100% {
    box-shadow: 0 4px 18px rgba(245, 158, 11, 0.55);
  }
}

@keyframes pick-glow-hover {
  0% {
    box-shadow: 0 8px 32px 4px rgba(245, 158, 11, 0.7);
  }
  33% {
    box-shadow: 0 8px 36px 6px rgba(239, 68, 68, 0.7);
  }
  66% {
    box-shadow: 0 8px 36px 6px rgba(139, 92, 246, 0.7);
  }
  100% {
    box-shadow: 0 8px 32px 4px rgba(245, 158, 11, 0.7);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pick-button.p-button {
    animation: none;
    box-shadow: 0 4px 18px rgba(239, 68, 68, 0.5);
  }
  .pick-button.p-button:not(:disabled):hover {
    animation: none;
    box-shadow: 0 8px 32px 4px rgba(239, 68, 68, 0.7);
  }
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

.actions {
  display: flex;
  gap: 0.25rem;
}

.empty {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
}

.add-form label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.movie-detail {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.detail-poster {
  flex-shrink: 0;
}

.detail-poster-img {
  width: 160px;
  border-radius: 6px;
  border: 1px solid var(--p-content-border-color);
}

.no-poster-large {
  width: 160px;
  height: 240px;
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
  gap: 0.6rem;
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
  font-size: 0.9rem;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .movie-detail {
    flex-direction: column;
  }

  .detail-poster-img,
  .no-poster-large {
    width: 100%;
  }
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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

  :deep(.p-selectbutton) {
    width: 100%;
    display: flex;
  }

  :deep(.p-selectbutton .p-togglebutton) {
    flex: 1;
    justify-content: center;
  }

  .toolbar-actions {
    width: 100%;
    margin-left: 0;
  }

  .search {
    flex: 1 1 100%;
    max-width: none;
  }

  .detail-poster-img {
    max-height: 220px;
    object-fit: contain;
  }

  .no-poster-large {
    height: 160px;
  }

  .pick-button.p-button,
  .pick-button.p-button:hover,
  .pick-button.p-button:focus,
  .pick-button.p-button:active {
    padding: 0.6rem 1.25rem;
  }
}
</style>
