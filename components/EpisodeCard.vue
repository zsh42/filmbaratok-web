<script setup lang="ts">
import { ref } from 'vue'
import type { Episode } from '@/types/episode'

defineProps<{ episode: Episode }>()

const broken = ref(false)

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('hu-HU')
}
</script>

<template>
  <NuxtLink :to="`/epizodok/${episode.slug}`" class="episode-card">
    <div class="card-banner">
      <NuxtImg
        v-if="episode.image && !broken"
        :src="episode.image"
        :alt="episode.title"
        width="480"
        height="270"
        loading="lazy"
        sizes="xs:100vw sm:50vw md:33vw lg:25vw"
        @error="broken = true"
      />
      <div v-else class="banner-fallback">
        <i class="pi pi-image" />
      </div>
    </div>
    <div class="card-body">
      <div v-if="episode.participants?.length" class="card-topics">
        <Chip v-for="(p, i) in episode.participants.slice(0, 3)" :key="i" :label="p.name" />
        <Chip
          v-if="(episode.participants.length || 0) > 3"
          :label="`+${episode.participants.length - 3}`"
        />
      </div>
      <Divider type="dashed" style="--p-divider-horizontal-margin: 0.25rem" />
      <h3 class="card-title">{{ episode.title }}</h3>
      <div class="card-meta">
        <span>{{ formatDate(episode.publishedAt) }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.episode-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius-md, 6px);
  overflow: hidden;
  cursor: pointer;
  background: var(--p-content-background);
  color: inherit;
  text-decoration: none;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
  height: 100%;
}

@media (hover: hover) and (pointer: fine) {
  .episode-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    border-color: var(--p-primary-color);
  }
}

.episode-card.tilt-active {
  overflow: visible;
  transform-style: preserve-3d;
}

.episode-card.tilt-active .card-banner {
  border-top-left-radius: var(--p-border-radius-md, 6px);
  border-top-right-radius: var(--p-border-radius-md, 6px);
}

.episode-card.tilt-active .card-body {
  transform-style: preserve-3d;
}

.episode-card.tilt-active .card-banner img,
.episode-card.tilt-active .banner-fallback {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}

.episode-card.tilt-active .card-title {
  transform: translateZ(25px);
}

.episode-card.tilt-active .card-topics {
  transform: translateZ(25px);
}

.episode-card.tilt-active .card-meta {
  transform: translateZ(15px);
}

.card-banner {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--p-content-background);
}

.card-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--p-text-muted-color);
}

.banner-fallback i {
  font-size: 2.5rem;
}

.card-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  display: flex;
  gap: 0.35rem;
  align-items: center;
  flex-wrap: wrap;
}

.card-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.card-topics :deep(.p-chip) {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
}
</style>
