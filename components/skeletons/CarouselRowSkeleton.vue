<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <section class="carousel-row-skeleton">
    <h2 v-if="title" class="row-title">{{ title }}</h2>
    <div v-else class="row-title-skeleton">
      <Skeleton width="12.5rem" height="1.5rem" border-radius="4px" />
    </div>
    <div class="cards-grid">
      <EpisodeCardSkeleton v-for="n in 4" :key="n" />
    </div>
  </section>
</template>

<style scoped>
.carousel-row-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.row-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.row-title-skeleton {
  height: 1.5rem;
  display: flex;
  align-items: center;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 1100px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .cards-grid > :nth-child(4) {
    display: none;
  }
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .cards-grid > :nth-child(3),
  .cards-grid > :nth-child(4) {
    display: none;
  }
}
</style>
