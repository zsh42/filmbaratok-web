<script setup lang="ts">
import type { MenuItem } from 'primevue/menuitem'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const siteUrl = useSiteConfig().url
useSeoMeta({
  ogImage: `${siteUrl}/brand.png`,
  ogImageWidth: 1424,
  ogImageHeight: 752,
  ogImageType: 'image/png',
  ogImageAlt: 'filmbarátok',
  twitterImage: `${siteUrl}/brand.png`,
})

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    { label: 'Epizódok', icon: 'pi pi-list', route: '/epizodok' },
    { label: 'A Nép akarata', icon: 'pi pi-sparkles', route: '/nep-akarata' },
  ]
  if (auth.isAuthenticated) {
    items.push({ label: 'Admin', icon: 'pi pi-cog', route: '/admin' })
  }
  return items
})

async function handleLogout() {
  await auth.logout()
  await router.push('/')
}

function goToProfile() {
  router.push('/admin/profile')
}

const hasTransparentNavSupport = computed(() => route.path === '/')
const isScrolled = ref(false)
const isSolid = computed(() => !hasTransparentNavSupport.value || isScrolled.value)

function handleScroll() {
  isScrolled.value = window.scrollY > 30
}

onMounted(() => {
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <Toast />
  <ConfirmDialog />

  <Menubar :model="menuItems" class="app-menubar" :class="{ 'is-solid': isSolid }">
    <template #start>
      <NuxtLink to="/" class="brand">Filmbarátok</NuxtLink>
    </template>

    <template #item="{ item, props }">
      <NuxtLink v-if="item.route" v-slot="{ href, navigate, isActive }" :to="item.route" custom>
        <a
          :href="href ?? undefined"
          v-bind="props.action"
          :class="{ 'router-link-active': isActive }"
          @click="navigate"
        >
          <span v-if="item.icon" :class="item.icon" />
          <span class="ml-2">{{ item.label }}</span>
        </a>
      </NuxtLink>
    </template>

    <template #end>
      <div class="menubar-end">
        <template v-if="auth.isAuthenticated">
          <Button
            icon="pi pi-cog"
            severity="secondary"
            text
            rounded
            aria-label="Profil"
            @click="goToProfile"
          />
          <Button
            icon="pi pi-sign-out"
            severity="secondary"
            text
            rounded
            aria-label="Kijelentkezés"
            @click="handleLogout"
          />
        </template>
      </div>
    </template>
  </Menubar>

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
.app-menubar {
  position: sticky;
  top: 0;
  z-index: 50;
  border-radius: 0;
  border-left: 0;
  border-right: 0;
  border-top: 0;
  transition:
    background-color 200ms ease,
    border-bottom-color 200ms ease,
    backdrop-filter 200ms ease;
}

.app-menubar:not(.is-solid) {
  background: transparent;
  border-bottom-color: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.app-menubar.is-solid {
  background-color: color-mix(in srgb, var(--p-content-background) 80%, transparent);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
}

.brand {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--p-text-color);
  text-decoration: none;
  padding-right: 1rem;
  white-space: nowrap;
}

.menubar-end {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.router-link-active {
  color: var(--p-primary-color);
}

:deep(.p-menubar-end) {
  min-width: 0;
  flex-shrink: 1;
}
</style>
