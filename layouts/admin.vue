<script setup lang="ts">
const route = useRoute()
const auth = useAuthStore()

const items = computed(() => {
  const base = [
    { label: 'Epizódok', route: '/admin' },
    { label: 'A Nép akarata', route: '/admin/movies' },
    { label: 'Címkék', route: '/admin/tags' },
    { label: 'Résztvevők', route: '/admin/participants' },
  ]
  if (auth.user?.permissions?.includes('super_admin')) {
    base.push({ label: 'Felhasználók', route: '/admin/users' })
  }
  return base
})

const activeIndex = computed(() => {
  return items.value.findIndex((item) => {
    if (item.route === '/admin') {
      return route.path === '/admin' || route.path.startsWith('/admin/episodes')
    }
    return route.path === item.route || route.path.startsWith(item.route + '/')
  })
})

function onTabChange(event: { index: number }) {
  const item = items.value[event.index]
  if (item) navigateTo(item.route)
}
</script>

<template>
  <div class="admin-layout">
    <TabMenu :model="items" :active-index="activeIndex" @tab-change="onTabChange" />
    <div class="admin-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
}

/* Allow TabMenu to scroll horizontally on narrow screens */
:deep(.p-tabmenu) {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

:deep(.p-tabmenu .p-tabmenu-tablist) {
  flex-wrap: nowrap;
  white-space: nowrap;
}

.admin-content {
  padding: 1.5rem;
}

@media (max-width: 480px) {
  .admin-content {
    padding: 1rem 0;
  }
}
</style>
