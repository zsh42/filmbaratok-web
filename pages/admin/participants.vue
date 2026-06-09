<script setup lang="ts">
import { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import {
  listParticipants,
  createParticipant,
  updateParticipant,
  deleteParticipant,
  mergeParticipant,
} from '~/composables/api/participants'
import { ApiError } from '~/composables/api/client'
import type { Participant, ParticipantLink } from '@/types/participant'

definePageMeta({ layout: 'admin', ssr: false, middleware: ['auth'] })
useSeoMeta({ title: 'Résztvevők – filmbarátok' })

const toast = useToast()
const confirm = useConfirm()

const participants = ref<Participant[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const searchInput = ref('')
const search = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const submitting = ref(false)

const sortField = ref<'name' | 'episodeCount'>('name')
const sortOrder = ref<1 | -1>(1)

const brokenAvatars = ref(new Set<number>())

function onAvatarError(id: number) {
  brokenAvatars.value.add(id)
}

const creating = ref(false)
const editing = ref<Participant | null>(null)
const merging = ref<Participant | null>(null)

const formName = ref('')
const formSlug = ref('')
const formBio = ref('')
const formAvatarUrl = ref('')
const formLinks = ref<ParticipantLink[]>([])

const mergeTarget = ref<Participant | null>(null)
const mergeSuggestions = ref<Participant[]>([])

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function onNameInput() {
  if (!editing.value) {
    formSlug.value = slugify(formName.value)
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await listParticipants({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value || null,
      sortField: sortField.value,
      sortOrder: sortOrder.value === 1 ? 'asc' : 'desc',
    })
    participants.value = res.participants
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = `Hiba a lekérdezés során (${err.status}).`
    } else {
      error.value = 'Hiba a lekérdezés során.'
    }
    participants.value = []
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

function onPage(event: DataTablePageEvent) {
  page.value = event.page + 1
  pageSize.value = event.rows
  load()
}

function onSort(event: DataTableSortEvent) {
  sortField.value = (event.sortField as 'name' | 'episodeCount') || 'name'
  sortOrder.value = event.sortOrder === -1 ? -1 : 1
  page.value = 1
  load()
}

function resetForm() {
  formName.value = ''
  formSlug.value = ''
  formBio.value = ''
  formAvatarUrl.value = ''
  formLinks.value = []
}

function openCreate() {
  resetForm()
  creating.value = true
}

function openEdit(participant: Participant) {
  formName.value = participant.name
  formSlug.value = participant.slug
  formBio.value = participant.bio ?? ''
  formAvatarUrl.value = participant.avatarUrl ?? ''
  formLinks.value = participant.links.map((l) => ({ ...l }))
  editing.value = participant
}

function openMerge(participant: Participant) {
  mergeTarget.value = null
  merging.value = participant
}

function addLink() {
  formLinks.value.push({ label: '', url: '' })
}

function removeLink(index: number) {
  formLinks.value.splice(index, 1)
}

async function onSave() {
  const name = formName.value.trim()
  if (!name) return

  const payload = {
    name,
    slug: formSlug.value.trim() || undefined,
    bio: formBio.value.trim() || null,
    avatarUrl: formAvatarUrl.value.trim() || null,
    links: formLinks.value.filter((l) => l.url.trim()),
  }

  submitting.value = true
  try {
    if (creating.value) {
      await createParticipant(payload)
      toast.add({
        severity: 'success',
        summary: 'Létrehozva',
        detail: `"${name}" hozzáadva.`,
        life: 3000,
      })
      creating.value = false
    } else if (editing.value) {
      await updateParticipant(editing.value.id, payload)
      toast.add({
        severity: 'success',
        summary: 'Mentve',
        detail: `"${name}" frissítve.`,
        life: 3000,
      })
      editing.value = null
    }
    await load()
  } catch (err) {
    let detail = 'Mentés sikertelen.'
    if (err instanceof ApiError) {
      if (err.status === 409) detail = 'Ilyen névvel vagy slug-gal már létezik résztvevő.'
      else if (err.status === 400) detail = 'Érvénytelen adat (ellenőrizd a linkeket).'
    }
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    submitting.value = false
  }
}

async function onMergeSearch(event: { query: string }) {
  try {
    const res = await listParticipants({ search: event.query, pageSize: 20 })
    mergeSuggestions.value = res.participants.filter((p) => p.id !== merging.value?.id)
  } catch {
    mergeSuggestions.value = []
  }
}

async function onMerge() {
  if (!merging.value || !mergeTarget.value) return

  submitting.value = true
  try {
    await mergeParticipant(merging.value.id, mergeTarget.value.id)
    toast.add({
      severity: 'success',
      summary: 'Összevonva',
      detail: `"${merging.value.name}" összevonva ide: "${mergeTarget.value.name}".`,
      life: 4000,
    })
    merging.value = null
    mergeTarget.value = null
    await load()
  } catch (err) {
    let detail = 'Összevonás sikertelen.'
    if (err instanceof ApiError) {
      if (err.status === 404) detail = 'Az egyik résztvevő nem található.'
      else if (err.status === 400) detail = 'Érvénytelen kérés.'
    }
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    submitting.value = false
  }
}

function onDelete(participant: Participant) {
  confirm.require({
    message: `Biztosan törölni szeretnéd: "${participant.name}"?`,
    header: 'Résztvevő törlése',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Törlés',
    rejectLabel: 'Mégse',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteParticipant(participant.id)
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

onMounted(() => {
  load()
})
</script>

<template>
  <section class="participants">
    <header class="page-header">
      <h2>Résztvevők</h2>
    </header>

    <div class="toolbar">
      <IconField class="search">
        <InputIcon class="pi pi-search" />
        <InputText v-model="searchInput" placeholder="Keresés…" @keyup.enter="applySearch" />
        <InputIcon v-if="searchInput" class="pi pi-times clear-icon" @click="clearSearch" />
      </IconField>
      <Button label="Keresés" icon="pi pi-search" @click="applySearch" />
      <Button label="Új résztvevő" icon="pi pi-plus" class="new-button" @click="openCreate" />
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div class="table-wrapper">
      <DataTable
        :value="participants"
        :loading="loading"
        lazy
        paginator
        :rows="pageSize"
        :total-records="total"
        :first="(page - 1) * pageSize"
        :rows-per-page-options="[20, 50, 100, 200]"
        data-key="id"
        striped-rows
        responsive-layout="scroll"
        paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
        current-page-report-template="{first}–{last} / {totalRecords}"
        :sort-field="sortField"
        :sort-order="sortOrder"
        @page="onPage"
        @sort="onSort"
      >
        <template #empty>
          <div class="empty">Nincs találat.</div>
        </template>

        <Column header="Avatar" style="width: 60px">
          <template #body="{ data }">
            <img
              v-if="data.avatarUrl && !brokenAvatars.has(data.id)"
              :src="data.avatarUrl"
              :alt="data.name"
              class="avatar-thumb"
              @error="onAvatarError(data.id)"
            />
            <div v-else class="avatar-fallback" :aria-label="data.name">
              <i class="pi pi-user" />
            </div>
          </template>
        </Column>

        <Column field="name" header="Név" sortable />

        <Column field="episodeCount" header="Epizódok" sortable style="width: 9rem">
          <template #body="{ data }">
            <span v-if="data.episodeCount" class="count-chip">{{ data.episodeCount }}</span>
            <span v-else class="muted">0</span>
          </template>
        </Column>

        <Column header="Linkek" style="width: 8rem">
          <template #body="{ data }">
            <span v-if="data.links?.length" class="link-chip">{{ data.links.length }} link</span>
            <span v-else class="muted">–</span>
          </template>
        </Column>

        <Column header="Műveletek" style="width: 10rem">
          <template #body="{ data }">
            <div class="actions">
              <Button
                icon="pi pi-pencil"
                severity="primary"
                text
                rounded
                aria-label="Szerkesztés"
                @click="openEdit(data)"
              />
              <Button
                icon="pi pi-arrows-h"
                severity="secondary"
                text
                rounded
                aria-label="Összevonás"
                @click="openMerge(data)"
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
      v-model:visible="creating"
      header="Új résztvevő"
      :style="{ width: '36rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
    >
      <div class="form-grid">
        <div class="form-field full">
          <label for="create-name">Név *</label>
          <InputText
            id="create-name"
            v-model="formName"
            placeholder="Teljes név"
            fluid
            @input="onNameInput"
          />
        </div>
        <div class="form-field full">
          <label for="create-slug">Slug</label>
          <InputText id="create-slug" v-model="formSlug" placeholder="auto-generált" fluid />
        </div>
        <div class="form-field full">
          <label for="create-avatar">Avatar URL</label>
          <InputText id="create-avatar" v-model="formAvatarUrl" placeholder="https://…" fluid />
        </div>
        <div class="form-field full">
          <label for="create-bio">Bio</label>
          <Textarea id="create-bio" v-model="formBio" rows="4" auto-resize fluid />
        </div>
        <div class="form-field full">
          <div class="links-header">
            <label>Linkek</label>
            <Button label="Hozzáadás" icon="pi pi-plus" size="small" text @click="addLink" />
          </div>
          <div v-if="formLinks.length" class="links-list">
            <div v-for="(link, idx) in formLinks" :key="idx" class="link-row">
              <InputText v-model="link.label" placeholder="Felirat" class="grow" fluid />
              <InputText v-model="link.url" placeholder="URL" class="grow" fluid />
              <Button
                icon="pi pi-times"
                severity="danger"
                text
                rounded
                aria-label="Eltávolítás"
                @click="removeLink(idx)"
              />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="creating = false" />
        <Button
          label="Mentés"
          icon="pi pi-check"
          :loading="submitting"
          :disabled="!formName.trim()"
          @click="onSave"
        />
      </template>
    </Dialog>

    <Dialog
      :visible="!!editing"
      header="Résztvevő szerkesztése"
      :style="{ width: '36rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
      @update:visible="
        (v) => {
          if (!v) editing = null
        }
      "
      @hide="editing = null"
    >
      <div class="form-grid">
        <div class="form-field full">
          <label for="edit-name">Név *</label>
          <InputText id="edit-name" v-model="formName" placeholder="Teljes név" fluid />
        </div>
        <div class="form-field full">
          <label for="edit-slug">Slug</label>
          <InputText id="edit-slug" v-model="formSlug" placeholder="slug" fluid />
        </div>
        <div class="form-field full">
          <label for="edit-avatar">Avatar URL</label>
          <InputText id="edit-avatar" v-model="formAvatarUrl" placeholder="https://…" fluid />
        </div>
        <div class="form-field full">
          <label for="edit-bio">Bio</label>
          <Textarea id="edit-bio" v-model="formBio" rows="4" auto-resize fluid />
        </div>
        <div class="form-field full">
          <div class="links-header">
            <label>Linkek</label>
            <Button label="Hozzáadás" icon="pi pi-plus" size="small" text @click="addLink" />
          </div>
          <div v-if="formLinks.length" class="links-list">
            <div v-for="(link, idx) in formLinks" :key="idx" class="link-row">
              <InputText v-model="link.label" placeholder="Felirat" class="grow" fluid />
              <InputText v-model="link.url" placeholder="URL" class="grow" fluid />
              <Button
                icon="pi pi-times"
                severity="danger"
                text
                rounded
                aria-label="Eltávolítás"
                @click="removeLink(idx)"
              />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="editing = null" />
        <Button
          label="Mentés"
          icon="pi pi-check"
          :loading="submitting"
          :disabled="!formName.trim()"
          @click="onSave"
        />
      </template>
    </Dialog>

    <Dialog
      :visible="!!merging"
      header="Résztvevők összevonása"
      :style="{ width: '34rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
      @update:visible="
        (v) => {
          if (!v) merging = null
        }
      "
      @hide="merging = null"
    >
      <div class="merge-body">
        <p class="merge-note">
          <strong>{{ merging?.name }}</strong> összes epizódja átkerül a kiválasztott résztvevőre,
          majd a forrás törlődik. Nem visszavonható.
        </p>
        <div class="form-field">
          <label for="merge-target">Célrésztvevő *</label>
          <AutoComplete
            id="merge-target"
            v-model="mergeTarget"
            :suggestions="mergeSuggestions"
            option-label="name"
            placeholder="Keresés…"
            fluid
            @complete="onMergeSearch"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="merging = null" />
        <Button
          label="Összevonás"
          icon="pi pi-arrows-h"
          severity="danger"
          :loading="submitting"
          :disabled="!mergeTarget"
          @click="onMerge"
        />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
.participants {
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

.new-button {
  margin-left: auto;
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

.empty {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

.avatar-thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  border: 1px solid var(--p-content-border-color);
}

.avatar-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-content-background);
  border: 1px dashed var(--p-content-border-color);
  color: var(--p-text-muted-color);
}

.avatar-fallback i {
  font-size: 1.1rem;
}

.link-chip {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--p-primary-100, rgba(99, 102, 241, 0.12));
  color: var(--p-primary-700, #4338ca);
  font-size: 0.8rem;
  font-weight: 500;
}

.count-chip {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--p-green-100, rgba(34, 197, 94, 0.12));
  color: var(--p-green-700, #15803d);
  font-size: 0.8rem;
  font-weight: 500;
}

.muted {
  color: var(--p-text-muted-color);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-field label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.links-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  margin-bottom: 0.25rem;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.link-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.grow {
  flex: 1 1 auto;
  min-width: 0;
}

.merge-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.merge-note {
  margin: 0;
  font-size: 0.9rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}

@media (max-width: 480px) {
  .page-header h2 {
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }

  .new-button {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }

  .link-row {
    flex-wrap: wrap;
  }

  .link-row .grow {
    flex: 1 1 100%;
  }
}
</style>
