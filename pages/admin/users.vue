<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { listUsers, createUser, updateUser, resetUserPassword, deleteUser } from '~/composables/api/users'
import { ApiError } from '~/composables/api/client'
import type { AdminUser } from '@/types/user'

definePageMeta({ layout: 'admin', ssr: false, middleware: ['auth', 'super-admin'] })
useSeoMeta({ title: 'Felhasználók – filmbarátok' })

const toast = useToast()
const confirm = useConfirm()

const users = ref<AdminUser[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const submitting = ref(false)

const creating = ref(false)
const editing = ref<AdminUser | null>(null)
const resetting = ref<AdminUser | null>(null)

const formEmail = ref('')
const formPassword = ref('')
const resetPasswordField = ref('')
const resetPasswordConfirm = ref('')

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('hu-HU')
}

function mapApiError(err: unknown, context: 'create' | 'edit' | 'reset' | 'delete'): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return 'Ez az e-mail cím már foglalt.'
    if (err.status === 400) return 'Érvénytelen adat.'
    if (err.status === 403) return 'A művelet nem engedélyezett.'
    if (err.status === 404) return 'A felhasználó nem található.'
  }
  const labels: Record<typeof context, string> = {
    create: 'Létrehozás sikertelen.',
    edit: 'Mentés sikertelen.',
    reset: 'Jelszó-visszaállítás sikertelen.',
    delete: 'Törlés sikertelen.',
  }
  return labels[context]
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await listUsers()
    users.value = res.users
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = `Hiba a lekérdezés során (${err.status}).`
    } else {
      error.value = 'Hiba a lekérdezés során.'
    }
    users.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  formEmail.value = ''
  formPassword.value = ''
  creating.value = true
}

function openEdit(user: AdminUser) {
  formEmail.value = user.email
  editing.value = user
}

function openReset(user: AdminUser) {
  resetPasswordField.value = ''
  resetPasswordConfirm.value = ''
  resetting.value = user
}

async function onSaveCreate() {
  const email = formEmail.value.trim()
  if (!email || !formPassword.value) {
    toast.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'Az e-mail és jelszó kötelező.', life: 3000 })
    return
  }
  if (formPassword.value.length < 8) {
    toast.add({ severity: 'warn', summary: 'Rövid jelszó', detail: 'A jelszónak legalább 8 karakter hosszúnak kell lennie.', life: 3000 })
    return
  }
  submitting.value = true
  try {
    await createUser({ email, password: formPassword.value })
    toast.add({ severity: 'success', summary: 'Létrehozva', detail: `"${email}" hozzáadva.`, life: 3000 })
    creating.value = false
    await load()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Hiba', detail: mapApiError(err, 'create'), life: 4000 })
  } finally {
    submitting.value = false
  }
}

async function onSaveEdit() {
  if (!editing.value) return
  const email = formEmail.value.trim()
  if (!email) {
    toast.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'Az e-mail cím kötelező.', life: 3000 })
    return
  }
  submitting.value = true
  try {
    await updateUser(editing.value.id, { email })
    toast.add({ severity: 'success', summary: 'Mentve', detail: `"${email}" frissítve.`, life: 3000 })
    editing.value = null
    await load()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Hiba', detail: mapApiError(err, 'edit'), life: 4000 })
  } finally {
    submitting.value = false
  }
}

async function onSaveReset() {
  if (!resetting.value) return
  if (!resetPasswordField.value || !resetPasswordConfirm.value) {
    toast.add({ severity: 'warn', summary: 'Hiányzó adat', detail: 'Mindkét jelszó megadása kötelező.', life: 3000 })
    return
  }
  if (resetPasswordField.value.length < 8) {
    toast.add({ severity: 'warn', summary: 'Rövid jelszó', detail: 'A jelszónak legalább 8 karakter hosszúnak kell lennie.', life: 3000 })
    return
  }
  if (resetPasswordField.value !== resetPasswordConfirm.value) {
    toast.add({ severity: 'warn', summary: 'Nem egyezik', detail: 'A két jelszó nem egyezik.', life: 3000 })
    return
  }
  submitting.value = true
  try {
    await resetUserPassword(resetting.value.id, resetPasswordField.value)
    toast.add({ severity: 'success', summary: 'Jelszó visszaállítva', life: 3000 })
    resetting.value = null
    await load()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Hiba', detail: mapApiError(err, 'reset'), life: 4000 })
  } finally {
    submitting.value = false
  }
}

function onDelete(user: AdminUser) {
  confirm.require({
    message: `Biztosan törölni szeretnéd: "${user.email}"?`,
    header: 'Felhasználó törlése',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Törlés',
    rejectLabel: 'Mégse',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteUser(user.id)
        toast.add({ severity: 'success', summary: 'Törölve', life: 3000 })
        await load()
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Hiba', detail: mapApiError(err, 'delete'), life: 4000 })
      }
    },
  })
}

onMounted(() => {
  load()
})
</script>

<template>
  <section class="users">
    <header class="page-header">
      <h2>Felhasználók</h2>
    </header>

    <div class="toolbar">
      <Button label="Új admin" icon="pi pi-plus" class="new-button" @click="openCreate" />
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div class="table-wrapper">
      <DataTable
        :value="users"
        :loading="loading"
        data-key="id"
        striped-rows
        responsive-layout="scroll"
      >
        <template #empty>
          <div class="empty">Nincs felhasználó.</div>
        </template>

        <Column field="email" header="Email" />

        <Column header="Jogosultságok" style="width: 14rem">
          <template #body="{ data }">
            <span v-if="data.permissions && data.permissions.length" class="perm-chip">
              {{ data.permissions.join(', ') }}
            </span>
            <span v-else class="muted">–</span>
          </template>
        </Column>

        <Column header="Utolsó belépés" style="width: 10rem">
          <template #body="{ data }">
            <span v-if="data.lastLogin">{{ formatDate(data.lastLogin) }}</span>
            <span v-else class="muted">—</span>
          </template>
        </Column>

        <Column header="Létrehozva" style="width: 10rem">
          <template #body="{ data }">
            {{ formatDate(data.createdAt) }}
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
                icon="pi pi-key"
                severity="secondary"
                text
                rounded
                aria-label="Jelszó visszaállítása"
                @click="openReset(data)"
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
      header="Új admin felhasználó"
      :style="{ width: '30rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
    >
      <div class="form-grid">
        <div class="form-field">
          <label for="create-email">E-mail cím *</label>
          <InputText id="create-email" v-model="formEmail" placeholder="admin@example.com" fluid />
        </div>
        <div class="form-field">
          <label for="create-password">Jelszó * <span class="hint">(min. 8 karakter)</span></label>
          <Password id="create-password" v-model="formPassword" :feedback="false" toggle-mask fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="creating = false" />
        <Button
          label="Létrehozás"
          icon="pi pi-check"
          :loading="submitting"
          :disabled="!formEmail.trim() || !formPassword"
          @click="onSaveCreate"
        />
      </template>
    </Dialog>

    <Dialog
      :visible="!!editing"
      header="Felhasználó szerkesztése"
      :style="{ width: '30rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
      @update:visible="(v) => { if (!v) editing = null }"
      @hide="editing = null"
    >
      <div class="form-grid">
        <div class="form-field">
          <label for="edit-email">E-mail cím *</label>
          <InputText id="edit-email" v-model="formEmail" placeholder="admin@example.com" fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="editing = null" />
        <Button
          label="Mentés"
          icon="pi pi-check"
          :loading="submitting"
          :disabled="!formEmail.trim()"
          @click="onSaveEdit"
        />
      </template>
    </Dialog>

    <Dialog
      :visible="!!resetting"
      header="Jelszó visszaállítása"
      :style="{ width: '30rem' }"
      :breakpoints="{ '768px': '95vw', '480px': '98vw' }"
      modal
      :draggable="false"
      dismissable-mask
      @update:visible="(v) => { if (!v) resetting = null }"
      @hide="resetting = null"
    >
      <div class="form-grid">
        <p class="reset-note muted">Felhasználó: <strong>{{ resetting?.email }}</strong></p>
        <div class="form-field">
          <label for="reset-password">Új jelszó * <span class="hint">(min. 8 karakter)</span></label>
          <Password id="reset-password" v-model="resetPasswordField" :feedback="false" toggle-mask fluid />
        </div>
        <div class="form-field">
          <label for="reset-password-confirm">Új jelszó megerősítése *</label>
          <Password id="reset-password-confirm" v-model="resetPasswordConfirm" :feedback="false" toggle-mask fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Mégse" severity="secondary" text @click="resetting = null" />
        <Button
          label="Visszaállítás"
          icon="pi pi-check"
          severity="danger"
          :loading="submitting"
          :disabled="!resetPasswordField || !resetPasswordConfirm"
          @click="onSaveReset"
        />
      </template>
    </Dialog>
  </section>
</template>

<style scoped>
.users {
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

.perm-chip {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--p-primary-100, rgba(99, 102, 241, 0.12));
  color: var(--p-primary-700, #4338ca);
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

.hint {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--p-text-muted-color);
}

.reset-note {
  margin: 0;
  font-size: 0.9rem;
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
