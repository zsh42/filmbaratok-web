<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import {
  getEpisode,
  updateEpisode,
  deleteEpisode,
  refreshEpisode,
} from '~/composables/api/episodes'
import { useAuthStore } from '~/stores/auth'
import { listTags, createTag } from '~/composables/api/tags'
import { listParticipants, createParticipant } from '~/composables/api/participants'
import { revalidateEpisode } from '~/composables/api/cache'
import { ApiError } from '~/composables/api/client'
import type { Episode, EpisodeTopic, EpisodeUpdatePayload } from '@/types/episode'
import type { Tag } from '@/types/tag'
import type { Participant } from '@/types/participant'

definePageMeta({ layout: 'admin', ssr: false, middleware: ['auth'] })
useSeoMeta({ title: 'Epizód szerkesztése – filmbarátok' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const auth = useAuthStore()

const episodeId = computed(() => route.params.id as string)

interface FormState {
  title: string
  description: string
  publishedAt: Date | null
  image: string
  topics: EpisodeTopic[]
  videoId: string
  downloadUrl: string
}

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const refreshing = ref(false)
const loadError = ref<string | null>(null)

const selectedTags = ref<Tag[]>([])
const selectedParticipants = ref<Participant[]>([])
const tagSuggestions = ref<Tag[]>([])
const participantSuggestions = ref<Participant[]>([])
const allTags = ref<Tag[]>([])
const topParticipants = ref<Participant[]>([])

const newTagDialogOpen = ref(false)
const newTagName = ref('')
const creatingTag = ref(false)
const newParticipantDialogOpen = ref(false)
const newParticipantName = ref('')
const creatingParticipant = ref(false)

const form = reactive<FormState>({
  title: '',
  description: '',
  publishedAt: null,
  image: '',
  topics: [],
  videoId: '',
  downloadUrl: '',
})

function hydrate(ep: Episode) {
  form.title = ep.title ?? ''
  form.description = ep.description ?? ''
  form.publishedAt = ep.publishedAt ? new Date(ep.publishedAt) : null
  form.image = ep.image ?? ''
  form.topics = (ep.topics ?? []).map((t) => ({
    title: t.title ?? '',
    startTime: t.startTime ?? '',
    url: t.url ?? '',
  }))
  form.videoId = ep.videoId ?? ''
  selectedTags.value = ep.tags ?? []
  selectedParticipants.value = ep.participants ?? []
  form.downloadUrl = ep.downloadUrl ?? ''
}

async function loadEpisode() {
  loading.value = true
  loadError.value = null
  try {
    const res = await getEpisode(episodeId.value)
    hydrate(res.episode)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      loadError.value = 'Az epizód nem található.'
    } else {
      loadError.value = 'Nem sikerült betölteni az epizódot.'
    }
  } finally {
    loading.value = false
  }
}

function buildYoutubeLink(videoId: string, startTime: string | null) {
  // if (!startTime) return `https://www.youtube.com/watch?v=${videoId}`;
  if (!startTime) return ''
  const parts = startTime.split(':').map(Number)
  let seconds = 0
  if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`
}

function buildPayload(): EpisodeUpdatePayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    publishedAt: form.publishedAt ? form.publishedAt.toISOString() : null,
    downloadUrl: form.downloadUrl || '',
    image: form.image.trim() || null,
    topics: form.topics
      .map((t) => ({
        title: t.title.trim(),
        startTime: t.startTime?.trim() || null,
        url: t.startTime?.trim() ? buildYoutubeLink(form.videoId, t.startTime?.trim()) : null,
      }))
      .filter((t) => t.title.length > 0),
    tagIds: selectedTags.value.map((t) => t.id),
    participantIds: selectedParticipants.value.map((p) => p.id),
  }
}

async function save() {
  if (!form.title.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Hiányzó cím',
      detail: 'A cím megadása kötelező.',
      life: 3000,
    })
    return
  }

  saving.value = true
  try {
    const res = await updateEpisode(episodeId.value, buildPayload())
    hydrate(res.episode)
    await revalidateEpisode(res.episode.slug)
    toast.add({
      severity: 'success',
      summary: 'Mentve',
      detail: 'Az epizód módosításai mentésre kerültek.',
      life: 3000,
    })
  } catch (err) {
    const msg =
      err instanceof ApiError ? `Mentés sikertelen (${err.status}).` : 'Mentés sikertelen.'
    toast.add({ severity: 'error', summary: 'Hiba', detail: msg, life: 4000 })
  } finally {
    saving.value = false
  }
}

function refresh() {
  confirm.require({
    message:
      'A YouTube-ról frissítjük az epizód adatait (cím, leírás, kép, témák, résztvevők). A nem mentett változtatások elvesznek. Folytatod?',
    header: 'Frissítés YouTube-ról',
    icon: 'pi pi-refresh',
    acceptLabel: 'Frissítés',
    rejectLabel: 'Mégse',
    accept: async () => {
      refreshing.value = true
      try {
        const res = await refreshEpisode(episodeId.value)
        hydrate(res.episode)
        await revalidateEpisode(res.episode.slug)
        toast.add({
          severity: 'success',
          summary: 'Frissítve',
          detail: 'Az epizód adatai frissítve a YouTube-ról.',
          life: 3000,
        })
      } catch (err) {
        let detail = 'Frissítés sikertelen.'
        if (err instanceof ApiError) {
          if (err.status === 403) detail = 'Csak super admin használhatja.'
          else if (err.status === 404) detail = 'A videó nem található a YouTube-on.'
          else if (err.status === 400) detail = 'Az epizódnak nincs YouTube videoId-ja.'
          else detail = `Frissítés sikertelen (${err.status}).`
        }
        toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
      } finally {
        refreshing.value = false
      }
    },
  })
}

function remove() {
  confirm.require({
    message: `Biztosan törölni szeretnéd a következőt: "${form.title}"?`,
    header: 'Epizód törlése',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Törlés',
    rejectLabel: 'Mégse',
    acceptClass: 'p-button-danger',
    accept: async () => {
      deleting.value = true
      try {
        await deleteEpisode(episodeId.value)
        await revalidateEpisode()
        toast.add({
          severity: 'success',
          summary: 'Törölve',
          detail: 'Az epizód törölve.',
          life: 3000,
        })
        navigateTo('/admin')
      } catch (err) {
        const msg =
          err instanceof ApiError ? `Törlés sikertelen (${err.status}).` : 'Törlés sikertelen.'
        toast.add({ severity: 'error', summary: 'Hiba', detail: msg, life: 4000 })
      } finally {
        deleting.value = false
      }
    },
  })
}

function addTopic() {
  form.topics.push({ title: '', startTime: '', url: '' })
}

function removeTopic(index: number) {
  form.topics.splice(index, 1)
}

async function onTagSearch(event: { query: string }) {
  try {
    const res = await listTags({ search: event.query, pageSize: 20 })
    tagSuggestions.value = res.tags
  } catch {
    tagSuggestions.value = []
  }
}

async function loadAllTags() {
  try {
    const res = await listTags({ pageSize: 100 })
    allTags.value = res.tags
  } catch {
    allTags.value = []
  }
}

async function loadTopParticipants() {
  try {
    const res = await listParticipants({
      pageSize: 10,
      sortField: 'episodeCount',
      sortOrder: 'desc',
    })
    topParticipants.value = res.participants
  } catch {
    topParticipants.value = []
  }
}

function isTagSelected(tag: Tag) {
  return selectedTags.value.some((t) => t.id === tag.id)
}

function toggleTag(tag: Tag) {
  if (isTagSelected(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t.id !== tag.id)
  } else {
    selectedTags.value = [...selectedTags.value, tag]
  }
}

function isParticipantSelected(p: Participant) {
  return selectedParticipants.value.some((x) => x.id === p.id)
}

function toggleParticipant(p: Participant) {
  if (isParticipantSelected(p)) {
    selectedParticipants.value = selectedParticipants.value.filter((x) => x.id !== p.id)
  } else {
    selectedParticipants.value = [...selectedParticipants.value, p]
  }
}

async function onParticipantSearch(event: { query: string }) {
  try {
    const res = await listParticipants({ search: event.query, pageSize: 20 })
    participantSuggestions.value = res.participants
  } catch {
    participantSuggestions.value = []
  }
}

async function onAddNewTag() {
  const name = newTagName.value.trim()
  if (!name) return

  creatingTag.value = true
  try {
    const res = await createTag(name)
    selectedTags.value = [...selectedTags.value, res.tag]
    if (!allTags.value.some((t) => t.id === res.tag.id)) {
      allTags.value = [...allTags.value, res.tag]
    }
    newTagName.value = ''
    newTagDialogOpen.value = false
    toast.add({
      severity: 'success',
      summary: 'Létrehozva',
      detail: `"${name}" hozzáadva.`,
      life: 3000,
    })
  } catch (err) {
    let detail = 'Létrehozás sikertelen.'
    if (err instanceof ApiError && err.status === 409) detail = 'Ilyen címke már létezik.'
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    creatingTag.value = false
  }
}

async function onAddNewParticipant() {
  const name = newParticipantName.value.trim()
  if (!name) return

  creatingParticipant.value = true
  try {
    const res = await createParticipant({ name })
    selectedParticipants.value = [...selectedParticipants.value, res.participant]
    newParticipantName.value = ''
    newParticipantDialogOpen.value = false
    toast.add({
      severity: 'success',
      summary: 'Létrehozva',
      detail: `"${name}" hozzáadva.`,
      life: 3000,
    })
  } catch (err) {
    let detail = 'Létrehozás sikertelen.'
    if (err instanceof ApiError && err.status === 409) detail = 'Ilyen résztvevő már létezik.'
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    creatingParticipant.value = false
  }
}

onMounted(() => {
  loadEpisode()
  loadAllTags()
  loadTopParticipants()
})
</script>

<template>
  <section class="edit">
    <div class="header">
      <Button
        label="Vissza"
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        @click="router.push('/admin')"
      />
    </div>

    <div v-if="loading" class="loader">
      <ProgressSpinner />
    </div>

    <Message v-else-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>

    <template v-else>
      <Card>
        <template #content>
          <div class="header-actions header-actions-group">
            <div class="header-actions">
              <Button
                v-if="form.videoId"
                as="a"
                :href="`https://www.youtube.com/watch?v=${form.videoId}`"
                target="_blank"
                rel="noopener noreferrer"
                label="`${form.title} – YouTube`"
                icon="pi pi-trash"
                severity="danger"
                rounded
                class="detail-action"
                :aria-label="`${form.title} – YouTube`"
              >
                <i class="pi pi-youtube" />
                <span>Lejátszás YouTube-on</span></Button
              >
            </div>
            <div class="header-actions">
              <Button
                v-if="auth.user?.permissions?.includes('super_admin')"
                label="Frissítés YouTube-ról"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                :loading="refreshing"
                :disabled="loading || !!loadError || !form.videoId"
                @click="refresh"
              />
              <Button
                label="Törlés"
                icon="pi pi-trash"
                severity="danger"
                outlined
                :loading="deleting"
                :disabled="loading || !!loadError"
                @click="remove"
              />
              <Button
                label="Mentés"
                icon="pi pi-save"
                :loading="saving"
                :disabled="loading || !!loadError"
                @click="save"
              />
            </div>
          </div>
        </template>
      </Card>
      <Card>
        <template #title> Alapadatok </template>
        <template #content>
          <div class="grid">
            <div class="field full">
              <label for="title">Cím *</label>
              <InputText id="title" v-model="form.title" fluid />
            </div>

            <div class="field">
              <label for="publishedAt">Közzététel ideje</label>
              <DatePicker
                id="publishedAt"
                v-model="form.publishedAt"
                show-time
                hour-format="24"
                date-format="yy.mm.dd"
                fluid
              />
            </div>

            <div class="field full">
              <label for="downloadUrl">Letöltési link</label>
              <InputText id="downloadUrl" v-model="form.downloadUrl" fluid />
            </div>

            <div class="field full">
              <label for="image">Borítókép URL</label>
              <InputText id="image" v-model="form.image" fluid />
              <div v-if="form.image" class="image-preview">
                <img :src="form.image" alt="Borítókép előnézet" />
              </div>
            </div>

            <div class="field full">
              <label for="description">Leírás</label>
              <Textarea id="description" v-model="form.description" rows="6" auto-resize fluid />
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>
          <div class="card-title">
            <span>Témák</span>
            <Button label="Hozzáadás" icon="pi pi-plus" size="small" text @click="addTopic" />
          </div>
        </template>
        <template #content>
          <p v-if="form.topics.length === 0" class="muted">Nincsenek témák.</p>
          <div v-else class="list">
            <div v-for="(topic, idx) in form.topics" :key="idx" class="list-row">
              <InputText v-model="topic.title" placeholder="Téma címe" class="grow" fluid />
              <InputText
                v-model="topic.startTime"
                placeholder="kezdés (pl. 12:34)"
                class="time-input"
                :value="topic.startTime"
              />
              <Button
                icon="pi pi-times"
                severity="danger"
                text
                rounded
                aria-label="Törlés"
                @click="removeTopic(idx)"
              />
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Címkék</template>
        <template #content>
          <div class="assoc-section">
            <div v-if="allTags.length" class="tag-pool">
              <button
                v-for="tag in allTags"
                :key="tag.id"
                type="button"
                class="tag-chip"
                :class="{ selected: isTagSelected(tag) }"
                @click="toggleTag(tag)"
              >
                {{ tag.name }}
              </button>
            </div>
            <AutoComplete
              v-model="selectedTags"
              :multiple="true"
              :suggestions="tagSuggestions"
              option-label="name"
              placeholder="Címke hozzáadása…"
              fluid
              @complete="onTagSearch"
            />
            <Button
              label="+ Új címke"
              size="small"
              text
              class="new-assoc-btn"
              @click="newTagDialogOpen = true"
            />
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Résztvevők</template>
        <template #content>
          <div class="assoc-section">
            <div v-if="topParticipants.length" class="tag-pool">
              <button
                v-for="p in topParticipants"
                :key="p.id"
                type="button"
                class="tag-chip"
                :class="{ selected: isParticipantSelected(p) }"
                @click="toggleParticipant(p)"
              >
                {{ p.name }}
              </button>
            </div>
            <AutoComplete
              v-model="selectedParticipants"
              :multiple="true"
              :suggestions="participantSuggestions"
              option-label="name"
              placeholder="Résztvevő hozzáadása…"
              fluid
              @complete="onParticipantSearch"
            />
            <Button
              label="+ Új résztvevő"
              size="small"
              text
              class="new-assoc-btn"
              @click="newParticipantDialogOpen = true"
            />
          </div>
        </template>
      </Card>
    </template>
  </section>

  <Dialog
    v-model:visible="newTagDialogOpen"
    header="Új címke létrehozása"
    :style="{ width: '26rem' }"
    :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
    modal
    :draggable="false"
    dismissable-mask
  >
    <div class="mini-form">
      <label for="new-tag-name">Név *</label>
      <InputText
        id="new-tag-name"
        v-model="newTagName"
        placeholder="Címke neve"
        fluid
        @keyup.enter="onAddNewTag"
      />
    </div>
    <template #footer>
      <Button label="Mégse" severity="secondary" text @click="newTagDialogOpen = false" />
      <Button
        label="Mentés"
        icon="pi pi-check"
        :loading="creatingTag"
        :disabled="!newTagName.trim()"
        @click="onAddNewTag"
      />
    </template>
  </Dialog>

  <Dialog
    v-model:visible="newParticipantDialogOpen"
    header="Új résztvevő létrehozása"
    :style="{ width: '26rem' }"
    :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
    modal
    :draggable="false"
    dismissable-mask
  >
    <div class="mini-form">
      <label for="new-participant-name">Név *</label>
      <InputText
        id="new-participant-name"
        v-model="newParticipantName"
        placeholder="Teljes név"
        fluid
        @keyup.enter="onAddNewParticipant"
      />
    </div>
    <template #footer>
      <Button label="Mégse" severity="secondary" text @click="newParticipantDialogOpen = false" />
      <Button
        label="Mentés"
        icon="pi pi-check"
        :loading="creatingParticipant"
        :disabled="!newParticipantName.trim()"
        @click="onAddNewParticipant"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.edit {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: end;
}

.header-actions-group {
  display: flex;
  justify-content: space-between;
}

.loader {
  display: flex;
  justify-content: center;
  padding: 3rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field.full {
  grid-column: 1 / -1;
}

.field.inline {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.field label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.image-preview {
  margin-top: 0.5rem;
}

.image-preview img {
  max-height: 160px;
  border-radius: 6px;
  border: 1px solid var(--p-content-border-color);
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.muted {
  color: var(--p-text-muted-color);
  margin: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.grow {
  flex: 1 1 auto;
  min-width: 0;
}

.time-input {
  width: 10rem;
}

.detail-action {
  text-decoration: none;
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .list-row {
    flex-wrap: wrap;
  }

  .time-input {
    width: 100%;
  }
}

.assoc-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.new-assoc-btn {
  align-self: flex-start;
  padding-left: 0;
}

.tag-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--p-content-border-color);
  background: transparent;
  color: var(--p-text-color);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    background-color 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.tag-chip:hover {
  border-color: var(--p-primary-color);
}

.tag-chip.selected {
  background: var(--p-primary-color);
  border-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color, #fff);
}

.mini-form {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-bottom: 0.5rem;
}

.mini-form label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 480px) {
  .page-header h2,
  h2 {
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }

  .header {
    row-gap: 0.75rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
