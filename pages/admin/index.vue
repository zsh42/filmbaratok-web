<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { type DataTablePageEvent } from 'primevue/datatable'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import {
  listEpisodes,
  syncYouTube,
  initSyncYouTube,
  importByVideoIds,
  deleteEpisode as deleteEpisodeApi,
} from '~/composables/api/episodes'
import { ApiError } from '~/composables/api/client'
import type { Episode } from '@/types/episode'

definePageMeta({ layout: 'admin', ssr: false, middleware: ['auth'] })
useSeoMeta({ title: 'Epizódok – filmbarátok' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const auth = useAuthStore()

const STORAGE_KEYS = {
  page: 'episode.list:page',
  search: 'episode.list:search',
  columns: 'episode.list:columns',
} as const

interface ColumnDef {
  id: string
  label: string
  essential?: boolean
  defaultOn?: boolean
}

const COLUMNS: ColumnDef[] = [
  { id: 'image', label: 'Borító', essential: true },
  { id: 'title', label: 'Cím', essential: true },
  { id: 'publishedAt', label: 'Közzétéve', defaultOn: true },
  { id: 'participants', label: 'Résztvevők' },
  { id: 'tags', label: 'Címkék', essential: true },
  { id: 'topicsCount', label: 'Témák' },
  { id: 'videoId', label: 'VideoId' },
  { id: 'status', label: 'Státusz' },
  { id: 'actions', label: 'Műveletek', essential: true },
]

const KNOWN_IDS = new Set(COLUMNS.map((c) => c.id))
const DEFAULT_VISIBLE = COLUMNS.filter((c) => c.defaultOn).map((c) => c.id)
const TOGGLEABLE_COLUMNS = COLUMNS.filter((c) => !c.essential)

function readStoredColumns(): string[] {
  if (!import.meta.client) return DEFAULT_VISIBLE
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.columns)
    if (!raw) return DEFAULT_VISIBLE
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE
    const valid = parsed.filter((id): id is string => typeof id === 'string' && KNOWN_IDS.has(id))
    return valid
  } catch {
    return DEFAULT_VISIBLE
  }
}

const episodes = ref<Episode[]>([])
const total = ref(0)
const page = ref(import.meta.client ? Number(localStorage.getItem(STORAGE_KEYS.page)) || 1 : 1)
const pageSize = ref(20)
const search = ref(import.meta.client ? localStorage.getItem(STORAGE_KEYS.search) || '' : '')
const searchInput = ref(search.value)
const loading = ref(false)
const syncing = ref(false)
const initSyncing = ref(false)
const importing = ref(false)
const importDialogOpen = ref(false)
const importInput = ref('')
const error = ref<string | null>(null)
const brokenImages = ref(new Set<string | number>())

const selectedColumnIds = ref<string[]>(readStoredColumns())

const visibleColumnSet = computed(() => new Set(selectedColumnIds.value))

function shouldShow(id: string): boolean {
  const def = COLUMNS.find((c) => c.id === id)
  if (def?.essential) return true
  return visibleColumnSet.value.has(id)
}

function onImgError(id: string | number) {
  brokenImages.value.add(id)
}

watch(
  selectedColumnIds,
  (val) => {
    localStorage.setItem(STORAGE_KEYS.columns, JSON.stringify(val))
  },
  { deep: true },
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await listEpisodes({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value || null,
    })
    episodes.value = res.episodes
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize
    localStorage.setItem(STORAGE_KEYS.page, String(page.value))
    localStorage.setItem(STORAGE_KEYS.search, search.value)
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

async function onSyncYouTube() {
  syncing.value = true
  try {
    const res = await syncYouTube()
    toast.add({
      severity: 'success',
      summary: 'Sync kész',
      detail: `${res.count} epizód szinkronizálva.`,
      life: 4000,
    })
    await load()
  } catch (err) {
    let detail = 'Sync sikertelen.'
    if (err instanceof ApiError) {
      detail = `Sync sikertelen (${err.status}).`
    }
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    syncing.value = false
  }
}

const parsedImportIds = computed(() => {
  return importInput.value
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
})

function openImportDialog() {
  importInput.value = ''
  importDialogOpen.value = true
}

async function onImportByVideoIds() {
  const ids = parsedImportIds.value
  if (ids.length === 0) return
  importing.value = true
  try {
    const res = await importByVideoIds(ids)
    importDialogOpen.value = false
    const parts = [`Lekérve: ${res.fetched}/${res.requested}`, `Importálva: ${res.imported}`]
    if (res.notFound.length > 0) {
      parts.push(`Nem található: ${res.notFound.length} (${res.notFound.slice(0, 3).join(', ')}${res.notFound.length > 3 ? '…' : ''})`)
    }
    toast.add({
      severity: res.notFound.length > 0 ? 'warn' : 'success',
      summary: 'Import kész',
      detail: parts.join(' • '),
      life: 6000,
    })
    await load()
  } catch (err) {
    let detail = 'Import sikertelen.'
    if (err instanceof ApiError) {
      if (err.status === 403) detail = 'Csak super admin használhatja.'
      else if (err.status === 400) detail = 'Hibás bemenet vagy nincs videoId.'
      else detail = `Import sikertelen (${err.status}).`
    }
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 5000 })
  } finally {
    importing.value = false
  }
}

async function onInitSyncYouTube() {
  initSyncing.value = true
  try {
    await initSyncYouTube()
    toast.add({
      severity: 'success',
      summary: 'Init sync indítva',
      life: 4000,
    })
    await load()
  } catch (err) {
    let detail = 'Init sync sikertelen.'
    if (err instanceof ApiError) {
      detail = `Init sync sikertelen (${err.status}).`
    }
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    initSyncing.value = false
  }
}

function onPage(event: DataTablePageEvent) {
  page.value = event.page + 1
  pageSize.value = event.rows
  load()
}

function formatDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('hu-HU')
}

function editEpisode(episode: Episode) {
  router.push('/admin/episodes/' + episode.id + '/edit')
}

function onDelete(episode: Episode) {
  confirm.require({
    message: `Biztosan törölni szeretnéd a következőt: "${episode.title}"?`,
    header: 'Epizód törlése',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Törlés',
    rejectLabel: 'Mégse',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteEpisodeApi(episode.id)
        toast.add({ severity: 'success', summary: 'Törölve', life: 3000 })
        await load()
      } catch (err) {
        const detail =
          err instanceof ApiError ? `Törlés sikertelen (${err.status}).` : 'Törlés sikertelen.'
        toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
      }
    },
  })
}

watch(
  () => route.fullPath,
  () => {
    /* keep state aligned if needed in the future */
  },
)

onMounted(() => {
  load()
})
</script>

<template>
  <section class="episodes">
    <header class="page-header">
      <h2>Epizódok</h2>
    </header>

    <div class="toolbar">
      <IconField class="search">
        <InputIcon class="pi pi-search" />
        <InputText v-model="searchInput" placeholder="Keresés…" @keyup.enter="applySearch" />
        <InputIcon v-if="searchInput" class="pi pi-times clear-icon" @click="clearSearch" />
      </IconField>
      <Button label="Keresés" icon="pi pi-search" @click="applySearch" />
      <MultiSelect
        v-model="selectedColumnIds"
        :options="TOGGLEABLE_COLUMNS"
        option-label="label"
        option-value="id"
        placeholder="Oszlopok"
        :max-selected-labels="0"
        :selected-items-label="`{0} oszlop`"
        class="columns-select"
      />
      <Button
        v-if="auth.user?.permissions?.includes('super_admin')"
        label="Sync (YouTube)"
        icon="pi pi-sync"
        severity="secondary"
        outlined
        :loading="syncing"
        class="sync-button"
        @click="onSyncYouTube"
      />
      <Button
        v-if="auth.user?.permissions?.includes('super_admin')"
        label="Init sync (YouTube)"
        icon="pi pi-upload"
        severity="warning"
        outlined
        :loading="initSyncing"
        class="sync-button"
        @click="onInitSyncYouTube"
      />
      <Button
        v-if="auth.user?.permissions?.includes('super_admin')"
        label="Import videoId-k"
        icon="pi pi-id-card"
        severity="secondary"
        outlined
        class="sync-button"
        @click="openImportDialog"
      />
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div class="table-wrapper">
      <DataTable
        :value="episodes"
        :loading="loading"
        lazy
        paginator
        :rows="pageSize"
        :total-records="total"
        :first="(page - 1) * pageSize"
        :rows-per-page-options="[10, 20, 50, 100]"
        data-key="id"
        striped-rows
        removable-sort
        responsive-layout="scroll"
        paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
        current-page-report-template="{currentPage} / {totalPages}"
        @page="onPage"
      >
        <template #empty>
          <div class="empty">Nincs epizód.</div>
        </template>

        <Column v-if="shouldShow('image')" header="Borító" style="width: 70px">
          <template #body="{ data }">
            <img
              v-if="data.image && !brokenImages.has(data.id)"
              :src="data.image"
              :alt="data.title"
              class="thumb"
              @error="onImgError(data.id)"
            />
            <div v-else class="thumb thumb-fallback" aria-label="Nincs kép">
              <i class="pi pi-image" />
            </div>
          </template>
        </Column>
        <Column field="title" header="Cím" />
        <Column v-if="shouldShow('publishedAt')" header="Közzétéve" style="width: 12rem">
          <template #body="{ data }">{{ formatDate(data.publishedAt) }}</template>
        </Column>
        <Column v-if="shouldShow('participants')" header="Résztvevők" style="min-width: 14rem">
          <template #body="{ data }">
            <div v-if="data.participants?.length" class="cell-chips">
              <Chip v-for="(p, i) in data.participants.slice(0, 3)" :key="i" :label="p.name" />
              <Chip
                v-if="data.participants.length > 3"
                :label="`+${data.participants.length - 3}`"
              />
            </div>
            <span v-else class="muted">–</span>
          </template>
        </Column>
        <Column v-if="shouldShow('tags')" header="Címkék" style="min-width: 12rem">
          <template #body="{ data }">
            <div v-if="data.tags?.length" class="cell-chips">
              <Chip v-for="(t, i) in data.tags.slice(0, 3)" :key="i" :label="t.name" />
              <Chip v-if="data.tags.length > 3" :label="`+${data.tags.length - 3}`" />
            </div>
            <span v-else class="muted">–</span>
          </template>
        </Column>
        <Column
          v-if="shouldShow('topicsCount')"
          header="Témák"
          style="width: 6rem"
          bodyStyle="text-align:center"
        >
          <template #body="{ data }">{{ data.topics?.length ?? 0 }}</template>
        </Column>
        <Column v-if="shouldShow('videoId')" header="VideoId" style="width: 11rem">
          <template #body="{ data }">
            <a
              v-if="data.videoId"
              :href="`https://www.youtube.com/watch?v=${data.videoId}`"
              target="_blank"
              rel="noopener noreferrer"
              class="video-id"
              @click.stop
            >
              {{ data.videoId }}
            </a>
            <span v-else class="muted">–</span>
          </template>
        </Column>
        <Column
          v-if="shouldShow('status')"
          header="Státusz"
          style="width: 5rem"
          bodyStyle="text-align:center"
        >
          <template #body="{ data }">
            <Button
              :icon="data.participants.length > 0 ? 'pi pi-check' : 'pi pi-times'"
              :severity="data.participants.length > 0 ? 'success' : 'danger'"
              rounded
              disabled
              style="width: 1.7rem; height: 1.7rem; user-select: none; opacity: 1 !important"
            />
          </template>
        </Column>
        <Column header="Műveletek">
          <template #body="{ data }">
            <div class="actions">
              <Button
                icon="pi pi-pencil"
                severity="primary"
                text
                rounded
                aria-label="Szerkesztés"
                @click="editEpisode(data)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                aria-label="Törlés"
                @click="onDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="importDialogOpen"
      header="Import videoId-k YouTube-ról"
      :style="{ width: '36rem' }"
      :breakpoints="{ '640px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
    >
      <div class="import-form">
        <label for="import-ids">YouTube videoId-k</label>
        <Textarea
          id="import-ids"
          v-model="importInput"
          rows="8"
          placeholder="Soronként, vesszővel vagy szóközzel elválasztva.&#10;Pl.&#10;dQw4w9WgXcQ&#10;abc123XYZ_-"
          fluid
          auto-resize
        />
        <p class="import-hint">
          {{ parsedImportIds.length }} érvényes id felismerve. Az auto-tag szabályok
          (cím alapján) ugyanúgy lefutnak az új epizódokra. Duplikátum nem keletkezik.
        </p>
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="importDialogOpen = false" />
        <Button
          label="Import"
          icon="pi pi-download"
          :loading="importing"
          :disabled="parsedImportIds.length === 0"
          @click="onImportByVideoIds"
        />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
.episodes {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header h2 {
  margin: 0;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.search {
  flex: 1 1 200px;
  max-width: 480px;
  min-width: 0;
}

.search :deep(input) {
  width: 100%;
}

.clear-icon {
  cursor: pointer;
  pointer-events: auto;
}

.sync-button {
  margin-left: auto;
}

.sync-button + .sync-button {
  margin-left: 0;
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

.actions {
  display: flex;
  gap: 0.25rem;
}

.columns-select {
  min-width: 10rem;
}

.import-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
}

.import-form label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.import-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.thumb {
  width: 56px;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.thumb-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-content-background);
  border: 1px dashed var(--p-content-border-color);
  color: var(--p-text-muted-color);
}

.thumb-fallback i {
  font-size: 1.1rem;
}

.cell-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.cell-chips :deep(.p-chip) {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
}

.muted {
  color: var(--p-text-muted-color);
}

.video-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
  color: var(--p-primary-color);
  text-decoration: none;
}

.video-id:hover {
  text-decoration: underline;
}

.empty {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

@media (max-width: 480px) {
  .page-header h2 {
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }
}
</style>
