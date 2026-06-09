<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { ApiError } from '~/composables/api/client'

definePageMeta({ layout: 'default', ssr: false, middleware: ['guest'] })
useSeoMeta({ title: 'Bejelentkezés – filmbarátok' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

async function handleSubmit() {
  error.value = null
  submitting.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string | undefined) || '/admin'
    await router.push(redirect)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      error.value = 'Hibás email vagy jelszó.'
    } else {
      error.value = 'Bejelentkezési hiba. Próbáld újra később.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="login">
    <Card>
      <template #title>Bejelentkezés</template>
      <template #content>
        <form class="login-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label for="email">Email</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              fluid
            />
          </div>

          <div class="field">
            <label for="password">Jelszó</label>
            <Password
              id="password"
              v-model="password"
              autocomplete="current-password"
              :feedback="false"
              toggle-mask
              required
              fluid
            />
          </div>

          <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

          <Button
            type="submit"
            label="Bejelentkezés"
            icon="pi pi-sign-in"
            :loading="submitting"
          />
        </form>
      </template>
    </Card>
  </section>
</template>

<style scoped>
.login {
  max-width: 420px;
  margin: 3rem auto;
  width: 100%;
}

@media (max-width: 480px) {
  .login {
    margin: 1.5rem auto;
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}
</style>
