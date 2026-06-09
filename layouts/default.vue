<script setup lang="ts">
useHead({
  bodyAttrs: { class: 'has-pattern-bg' },
})
</script>

<template>
  <main class="page-container">
    <slot />
  </main>
</template>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

@media (max-width: 768px) {
  .page-container {
    padding: 1rem 0.75rem;
  }
}
</style>
