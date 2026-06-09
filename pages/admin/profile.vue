<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import { changePassword } from '~/composables/api/auth'
import { ApiError } from '~/composables/api/client'

definePageMeta({ layout: 'admin', ssr: false, middleware: ['auth'] })
useSeoMeta({ title: 'Profil – filmbarátok' })

const toast = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const submitting = ref(false)
const validationError = ref<string | null>(null)

function resetForm() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  validationError.value = null
}

async function onSubmit() {
  validationError.value = null

  if (!currentPassword.value || !newPassword.value || !confirmNewPassword.value) {
    validationError.value = 'Minden mező kitöltése kötelező.'
    return
  }
  if (newPassword.value.length < 8) {
    validationError.value = 'Az új jelszónak legalább 8 karakter hosszúnak kell lennie.'
    return
  }
  if (newPassword.value !== confirmNewPassword.value) {
    validationError.value = 'A két jelszó nem egyezik.'
    return
  }

  submitting.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    toast.add({ severity: 'success', summary: 'Jelszó frissítve', life: 3000 })
    resetForm()
  } catch (err) {
    let detail = 'Mentés sikertelen.'
    if (err instanceof ApiError && err.status === 400) {
      detail = 'A jelenlegi jelszó nem megfelelő.'
    }
    toast.add({ severity: 'error', summary: 'Hiba', detail, life: 4000 })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="profile">
    <header class="page-header">
      <h2>Profil</h2>
    </header>

    <div class="card-wrapper">
      <div class="password-card">
        <h3 class="card-title">Jelszó módosítása</h3>

        <div class="form-grid">
          <div class="form-field">
            <label for="current-password">Jelenlegi jelszó</label>
            <Password
              id="current-password"
              v-model="currentPassword"
              :feedback="false"
              toggle-mask
              fluid
            />
          </div>

          <div class="form-field">
            <label for="new-password">Új jelszó</label>
            <Password
              id="new-password"
              v-model="newPassword"
              :feedback="false"
              toggle-mask
              fluid
            />
            <span class="hint">Minimum 8 karakter</span>
          </div>

          <div class="form-field">
            <label for="confirm-password">Új jelszó megerősítése</label>
            <Password
              id="confirm-password"
              v-model="confirmNewPassword"
              :feedback="false"
              toggle-mask
              fluid
            />
          </div>

          <p v-if="validationError" class="validation-error">{{ validationError }}</p>

          <Button
            label="Jelszó mentése"
            icon="pi pi-check"
            :loading="submitting"
            @click="onSubmit"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header h2 {
  margin: 0;
}

.card-wrapper {
  display: flex;
  justify-content: center;
}

.password-card {
  width: 100%;
  max-width: 28rem;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius, 0.5rem);
  padding: 1.5rem;
}

.card-title {
  margin: 0 0 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
  color: var(--p-text-muted-color);
}

.validation-error {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-red-500, #ef4444);
}

@media (max-width: 480px) {
  .page-header h2 {
    font-size: clamp(1.25rem, 5vw, 1.75rem);
  }

  .password-card {
    border: none;
    padding: 0;
    background: transparent;
  }
}
</style>
