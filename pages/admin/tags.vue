<script setup lang="ts">
import { type DataTablePageEvent } from 'primevue/datatable'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { listTags, createTag, updateTag, deleteTag, mergeTag } from '~/composables/api/tags'
import { ApiError } from '~/composables/api/client'
import type { Tag } from '@/types/tag'

definePageMeta({ layout: 'admin', ssr: false, middleware: ['auth'] })
useSeoMeta({ title: 'Címkék – filmbarátok' })

const toast = useToast()
const confirm = useConfirm()

const tags = ref<Tag[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const searchInput = ref('')
const search = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const submitting = ref(false)

const creating = ref(false)
const editing = ref<Tag | null>(null)
const merging = ref<Tag | null>(null)

const editName = ref('')
const mergeTarget = ref<Tag | null>(null)
const mergeSuggestions = ref<Tag[]>([])

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await listTags({ page: page.value, pageSize: pageSize.value, search: search.value || null })
    tags.value = res.tags
    total.value = res.total
    page.value = res.page
    pageSize.value = res.pageSize
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = `Hiba a lekérdezés során (${err.status}).`
    } else {
      error.value = 'Hiba a lekérdezés során.'
    }
    tags.value = []
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

function openCreate() {
  editName.value = ''
  creating.value = true
}

function openEdit(tag: Tag) {
  editName.value = tag.name
  editing.value = tag
}

function openMerge(tag: Tag) {
  mergeTarget.value = null
  merging.value = tag
}

async function onSave() {
  const name = editName.value.trim()
  if (!name) return

  submitting.value = true
  try {
    if (creating.value) {
      await createTag(name)
      toast.add({ severity: 'success', summary: 'Létrehozva', detail: `"${name}" hozzáadva.`, life: 3000 })
      creating.value = false
    } else if (editing.value) {
      await updateTag(editing.value.id, name)
      toast.add({ severity: 'success', summary: 'Mentve', detail: `"${name}" frissítve.`, life: 3000 })
      editing.value = null
    }
    await load()
  } catch (err) {
    let detail = 'Mentés sikertelen.'
    if (err instanceof ApiError) {
      if (err.status === 409) detail = 'Ilyen címke már létezik.'
      else if (err.status === 400) detail = 'Érvénytelen adat.'
    }
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    submitting.value = false
  }
}

async function onMergeSearch(event: { query: string }) {
  try {
    const res = await listTags({ search: event.query, pageSize: 20 })
    mergeSuggestions.value = res.tags.filter((t) => t.id !== merging.value?.id)
  } catch {
    mergeSuggestions.value = []
  }
}

async function onMerge() {
  if (!merging.value || !mergeTarget.value) return

  submitting.value = true
  try {
    await mergeTag(merging.value.id, mergeTarget.value.id)
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
      if (err.status === 404) detail = 'Az egyik címke nem található.'
      else if (err.status === 400) detail = 'Érvénytelen kérés.'
    }
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    submitting.value = false
  }
}

function onDelete(tag: Tag) {
  confirm.require({
    message: `Biztosan törölni szeretnéd: "${tag.name}"?`,
    header: 'Címke törlése',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Törlés',
    rejectLabel: 'Mégse',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteTag(tag.id)
        toast.add({ severity: 'success', summary: 'Törölve', life: 3000 })
        await load()
      } catch (err) {
        const detail = err instanceof ApiError ? `Törlés sikertelen (${err.status}).` : 'Törlés sikertelen.'
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
  <section class="tags">
    <header class="page-header">
      <h2>Címkék</h2>
    </header>

    <div class="toolbar">
      <IconField class="search">
        <InputIcon class="pi pi-search" />
        <InputText v-model="searchInput" placeholder="Keresés…" @keyup.enter="applySearch" />
        <InputIcon v-if="searchInput" class="pi pi-times clear-icon" @click="clearSearch" />
      </IconField>
      <Button label="Keresés" icon="pi pi-search" @click="applySearch" />
      <Button label="Új címke" icon="pi pi-plus" class="new-button" @click="openCreate" />
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div class="table-wrapper">
      <DataTable
        :value="tags"
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
        @page="onPage"
      >
        <template #empty>
          <div class="empty">Nincs találat.</div>
        </template>

        <Column field="name" header="Név" />

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
      header="Új címke"
      :style="{ width: '28rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
    >
      <div class="form-field">
        <label for="create-name">Név *</label>
        <InputText
          id="create-name"
          v-model="editName"
          placeholder="Címke neve"
          fluid
          @keyup.enter="onSave"
        />
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="creating = false" />
        <Button
          label="Mentés"
          icon="pi pi-check"
          :loading="submitting"
          :disabled="!editName.trim()"
          @click="onSave"
        />
      </template>
    </Dialog>

    <Dialog
      :visible="!!editing"
      header="Címke szerkesztése"
      :style="{ width: '28rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
      @update:visible="(v) => { if (!v) editing = null }"
      @hide="editing = null"
    >
      <div class="form-field">
        <label for="edit-name">Név *</label>
        <InputText
          id="edit-name"
          v-model="editName"
          placeholder="Címke neve"
          fluid
          @keyup.enter="onSave"
        />
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="editing = null" />
        <Button
          label="Mentés"
          icon="pi pi-check"
          :loading="submitting"
          :disabled="!editName.trim()"
          @click="onSave"
        />
      </template>
    </Dialog>

    <Dialog
      :visible="!!merging"
      header="Címkék összevonása"
      :style="{ width: '34rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
      @update:visible="(v) => { if (!v) merging = null }"
      @hide="merging = null"
    >
      <div class="merge-body">
        <p class="merge-note">
          <strong>{{ merging?.name }}</strong> összes epizódja átkerül a kiválasztott
          célcímkére, majd a forrás törlődik. Nem visszavonható.
        </p>
        <div class="form-field">
          <label for="merge-target">Célcímke *</label>
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
.tags {
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

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-bottom: 0.5rem;
}

.form-field label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
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
}
</style>
