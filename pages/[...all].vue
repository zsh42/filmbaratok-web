<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Nem található – filmbarátok', robots: 'noindex' })

const event = useRequestEvent()
if (event) setResponseStatus(event, 404)

const router = useRouter()
</script>

<template>
  <section class="not-found">
    <h1>404</h1>
    <p>Az oldal nem található.</p>
    <Button label="Vissza a kezdőlapra" icon="pi pi-home" @click="router.push('/')" />
  </section>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding: 4rem 1rem;
}

.not-found h1 {
  font-size: 4rem;
  margin: 0;
}
</style>
