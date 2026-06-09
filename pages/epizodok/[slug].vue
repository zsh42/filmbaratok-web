<script setup lang="ts">
import { computed, ref } from 'vue'
import { getPublicEpisodeBySlug, getPublicRelatedEpisodes } from '~/composables/api/episodes'
import { ApiError } from '~/composables/api/client'

definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const siteUrl = useSiteConfig().url

const { data } = await useFreshAsyncData(`episode-${slug.value}`, async () => {
  try {
    return await getPublicEpisodeBySlug(slug.value)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null
    }
    throw err
  }
})

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Epizód nem található', fatal: true })
}

const episode = computed(() => data.value!.episode)

const { data: relatedData } = await useFreshAsyncData(`episode-related-${slug.value}`, async () => {
  try {
    return await getPublicRelatedEpisodes(slug.value, 20)
  } catch {
    return { episodes: [] }
  }
})

const participantString = computed(
  () => episode.value.participants?.map((p) => p.name).join(' - ') ?? '',
)

const relatedEpisodes = computed(() => relatedData.value?.episodes ?? [])
const brokenRelatedImages = ref(new Set<string | number>())

function onRelatedImgError(id: string | number) {
  brokenRelatedImages.value.add(id)
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short' })
}

const pageUrl = computed(() => `${siteUrl}/epizodok/${episode.value.slug}`)
const watchUrl = computed(() =>
  episode.value.videoId ? `https://www.youtube.com/watch?v=${episode.value.videoId}` : null,
)
const embedUrl = computed(() =>
  episode.value.videoId ? `https://www.youtube-nocookie.com/embed/${episode.value.videoId}` : null,
)

const shortDescription = computed(() => {
  const text = episode.value.description || ''
  const firstLine =
    text
      .split('\n')
      .find((l) => l.trim().length > 0)
      ?.trim() ?? ''
  if (firstLine.length <= 160) return firstLine
  return firstLine.slice(0, 157).replace(/\s+\S*$/, '') + '…'
})

const heroImage = computed(() => episode.value.image || '')

const publishedLong = computed(() => {
  if (!episode.value.publishedAt) return ''
  const d = new Date(episode.value.publishedAt)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
})

const responsiveOptions = ref([
  { breakpoint: '1400px', numVisible: 5, numScroll: 1 },
  { breakpoint: '1100px', numVisible: 4, numScroll: 1 },
  { breakpoint: '900px', numVisible: 3, numScroll: 1 },
  { breakpoint: '640px', numVisible: 3, numScroll: 2 },
  { breakpoint: '420px', numVisible: 2, numScroll: 2 },
])

useSeoMeta({
  title: `${episode.value.title} – filmbarátok`,
  description: shortDescription.value || 'A filmbarátok podcast epizódja.',
  ogTitle: episode.value.title,
  ogDescription: shortDescription.value || 'A filmbarátok podcast epizódja.',
  ogType: 'video.episode',
  ogImage: episode.value.image || undefined,
  ogUrl: pageUrl.value,
  twitterCard: 'summary_large_image',
})

useHead(
  computed(() => ({
    link: [{ rel: 'canonical', href: pageUrl.value }],
    script: [
      {
        type: 'application/ld+json',
        key: 'schema-episode',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: episode.value.title,
          description: shortDescription.value || episode.value.title,
          thumbnailUrl: episode.value.image || undefined,
          uploadDate: episode.value.publishedAt || undefined,
          contentUrl: watchUrl.value || undefined,
          embedUrl: embedUrl.value || undefined,
        }),
      },
      {
        type: 'application/ld+json',
        key: 'schema-breadcrumb',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Kezdőlap', item: `${siteUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Epizódok', item: `${siteUrl}/` },
            { '@type': 'ListItem', position: 3, name: episode.value.title, item: pageUrl.value },
          ],
        }),
      },
    ],
  })),
)
</script>

<template>
  <article class="episode-page">
    <section class="hero" aria-label="Epizód">
      <NuxtImg
        v-if="heroImage"
        class="hero-bg"
        :src="heroImage"
        alt=""
        width="1400"
        height="788"
        sizes="100vw md:1400px"
        preload
        fetchpriority="high"
      />
      <div class="hero-scrim" />

      <NuxtLink to="/" class="hero-back" aria-label="Vissza az epizódokhoz">
        <i class="pi pi-arrow-left" />
        <span>Epizódok</span>
      </NuxtLink>

      <div class="hero-content">
        <h1 class="hero-title">{{ episode.title }}</h1>

        <div v-if="participantString" class="hero-participants">
          <span>{{ participantString }}</span>
        </div>

        <div v-if="publishedLong" class="hero-meta">
          <span class="meta-item meta-date">
            <i class="pi pi-calendar" aria-hidden="true" />
            {{ publishedLong }}
          </span>
        </div>

        <div class="hero-actions">
          <a
            v-if="watchUrl"
            :href="watchUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="primary-action"
          >
            <i class="pi pi-play-circle" />
            <span>Megnézés</span>
          </a>

          <a
            v-if="episode.soundcloudUrl"
            :href="episode.soundcloudUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="icon-action"
            aria-label="SoundCloud-on hallgatás"
            v-tooltip.bottom="'SoundCloud'"
          >
            <svg
              class="action-svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M1.4 14.4c.1 0 .2-.1.2-.2l.3-2-.3-2c0-.1-.1-.2-.2-.2s-.2.1-.2.2l-.3 2 .3 2c0 .1.1.2.2.2zm1.4.6c.1 0 .2-.1.2-.2l.4-2.6-.4-2.7c0-.1-.1-.2-.2-.2s-.2.1-.2.2l-.3 2.7.3 2.6c0 .1.1.2.2.2zm1.6.3c.2 0 .3-.1.3-.3l.3-2.8-.3-2.9c0-.2-.1-.3-.3-.3s-.3.1-.3.3l-.3 2.9.3 2.8c0 .2.1.3.3.3zm1.6.1c.2 0 .3-.1.3-.3l.3-2.9-.3-3c0-.2-.1-.3-.3-.3s-.3.1-.3.3l-.2 3 .2 2.9c0 .2.1.3.3.3zm1.7-.1c.2 0 .4-.2.4-.4l.2-2.7-.2-5.1c0-.2-.2-.4-.4-.4s-.4.2-.4.4l-.2 5.1.2 2.7c0 .2.2.4.4.4zm1.7.1c.2 0 .4-.2.4-.4l.2-2.8-.2-6.6c0-.2-.2-.4-.4-.4s-.4.2-.4.4l-.2 6.6.2 2.8c0 .2.2.4.4.4zm1.8.1c.3 0 .5-.2.5-.5l.2-2.8-.2-7c0-.3-.2-.5-.5-.5s-.5.2-.5.5l-.1 7 .1 2.8c0 .3.2.5.5.5zM12.9 16c.3 0 .5-.2.5-.5l.2-3-.2-7.4c0-.3-.2-.5-.5-.5s-.5.2-.5.5l-.1 7.4.1 3c0 .3.2.5.5.5zm6.5 0h-4.7c-.3 0-.5-.2-.5-.5V6c0-.2.1-.4.4-.5.6-.3 1.3-.5 2.1-.5 2.6 0 4.7 2 4.9 4.6 1 .4 1.8 1.4 1.8 2.6 0 1.5-1.3 2.8-2.9 2.8z"
              />
            </svg>
          </a>

          <a
            v-if="episode.downloadUrl"
            :href="episode.downloadUrl"
            target="_blank"
            rel="noopener noreferrer"
            download
            class="icon-action"
            aria-label="Letöltés"
            v-tooltip.bottom="'Letöltés'"
          >
            <i class="pi pi-download" />
          </a>
        </div>
      </div>
    </section>

    <section v-if="episode.topics?.length" class="block">
      <h2 class="section-title">Témák</h2>
      <ol class="topics-list">
        <li v-for="(t, i) in episode.topics" :key="`t-${i}`" class="topic-row">
          <a
            v-if="t.url"
            :href="t.url"
            target="_blank"
            rel="noopener noreferrer"
            class="topic-link"
            :aria-label="`${t.title} – YouTube`"
            v-tooltip.top="{ value: 'Megnyitás YouTube-on', showDelay: 600, hideDelay: 200 }"
          >
            <span v-if="t.startTime" class="topic-time">{{ t.startTime }}</span>
            <span class="topic-title">{{ t.title }}</span>
            <i class="pi pi-play-circle topic-icon" />
          </a>
          <div v-else class="topic-link topic-link-static">
            <span v-if="t.startTime" class="topic-time">{{ t.startTime }}</span>
            <span class="topic-title">{{ t.title }}</span>
          </div>
        </li>
      </ol>
    </section>

    <section v-if="episode.participants?.length" class="block participants-block">
      <h2 class="section-title">Résztvevők</h2>
      <div class="participants-grid">
        <div v-for="p in episode.participants" :key="`p-${p.id}`" class="participants-card">
          <Avatar
            :image="p.avatarUrl || undefined"
            :icon="!p.avatarUrl ? 'pi pi-user' : undefined"
            class="participant-image"
            size="xlarge"
            shape="circle"
            aria-hidden="true"
          />
          <div class="participant-name">{{ p.name }}</div>
        </div>
      </div>
    </section>

    <section v-if="relatedEpisodes.length" class="block related-block">
      <h2 class="section-title">Hasonló epizódok</h2>

      <Carousel
        :value="relatedEpisodes"
        :numVisible="6"
        :numScroll="1"
        circular
        :responsiveOptions="responsiveOptions"
        :showIndicators="false"
      >
        <template #item="slotProps">
          <NuxtLink
            :key="slotProps.data.id"
            :to="`/epizodok/${slotProps.data.slug}`"
            class="poster-card"
          >
            <div class="poster-image">
              <NuxtImg
                v-if="slotProps.data.image && !brokenRelatedImages.has(slotProps.data.id)"
                :src="slotProps.data.image"
                :alt="slotProps.data.title"
                width="360"
                height="640"
                loading="lazy"
                sizes="xs:50vw sm:33vw md:25vw lg:16vw"
                @error="onRelatedImgError(slotProps.data.id)"
              />
              <div v-else class="poster-fallback">
                <i class="pi pi-image" />
              </div>
              <div class="poster-scrim" aria-hidden="true" />
              <div class="poster-overlay">
                <span v-if="slotProps.data.publishedAt" class="poster-date">
                  {{ formatShortDate(slotProps.data.publishedAt) }}
                </span>
                <h3 class="poster-title">{{ slotProps.data.title }}</h3>
              </div>
            </div>
          </NuxtLink>
        </template>
      </Carousel>
    </section>
  </article>
</template>

<style scoped>
.episode-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin: -2rem -1rem 0;
  overflow-x: clip;
}

@media (max-width: 768px) {
  .episode-page {
    margin: -1rem -0.75rem 0;
    gap: 1.5rem;
  }
}

/* ===== Hero ===== */
.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  min-height: clamp(28rem, 64vh, 44rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 6rem 1.5rem 7rem;
  color: #fff;
  background: #08080d;
}

.hero::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--p-content-background) 80%,
    var(--p-content-background) 100%
  );
  z-index: 1;
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.hero-scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    180deg,
    rgba(8, 8, 13, 0.35) 0%,
    rgba(8, 8, 13, 0.15) 30%,
    rgba(8, 8, 13, 0.55) 70%,
    rgba(8, 8, 13, 0.92) 100%
  );
}

.hero-back {
  position: absolute;
  top: 1.25rem;
  left: max(1.25rem, calc(50vw - 600px + 1.25rem));
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.9rem 0.45rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition:
    background-color 0.2s,
    color 0.2s,
    transform 0.15s;
}

.hero-back:hover,
.hero-back:focus-visible {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  transform: translateX(-2px);
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  max-width: 48rem;
  text-align: center;
}

.hero-title {
  margin: 0;
  font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, 'Times New Roman', serif;
  font-weight: 400;
  font-size: clamp(2.25rem, 5vw, 4.25rem);
  line-height: 1.05;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.55);
}

.hero-subtitle {
  margin: 0;
  font-size: clamp(0.85rem, 1.4vw, 1rem);
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.02em;
}

.hero-meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.78);
  margin-top: 0.25rem;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-variant-numeric: tabular-nums;
}

.meta-date i {
  font-size: 0.9rem;
  opacity: 0.7;
}

.hero-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 1.4rem;
  border-radius: 999px;
  background: #fff;
  color: #0c0c14;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.2s,
    background-color 0.2s;
  box-shadow: 0 6px 18px -6px rgba(0, 0, 0, 0.55);
}

.primary-action:hover,
.primary-action:focus-visible {
  transform: translateY(-1px);
  background: #f6f6f9;
  box-shadow: 0 10px 22px -8px rgba(0, 0, 0, 0.6);
}

.primary-action i {
  font-size: 1.2rem;
}

.icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.15s,
    border-color 0.2s;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.icon-action:hover,
.icon-action:focus-visible {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.24);
  transform: translateY(-1px);
}

.icon-action i {
  font-size: 1.05rem;
}

.action-svg {
  width: 1.25rem;
  height: 1.25rem;
}

/* ===== Blocks (participants, topics) ===== */
.block {
  max-width: 56rem;
  width: 100%;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
}

/* ===== Hero participants line ===== */
.hero-participants {
  font-size: clamp(0.9rem, 1.4vw, 1.05rem);
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 0.02em;
  font-style: italic;
  text-align: center;
  max-width: 40rem;
  line-height: 1.4;
}

/* ===== Participants section ===== */
.participants-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-start;
}

.participants-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  width: 8rem;
  padding: 1.1rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.75rem;
  background: var(--p-content-background);
  transition:
    border-color 0.2s,
    transform 0.15s;
}

@media (hover: hover) and (pointer: fine) {
  .participants-card:hover {
    border-color: var(--p-primary-color);
    transform: translateY(-2px);
  }
}

.participant-name {
  font-size: 0.85rem;
  text-align: center;
  line-height: 1.3;
  word-break: break-word;
  color: var(--p-text-color);
}

@media (max-width: 480px) {
  .participants-grid {
    gap: 0.5rem;
  }

  .participants-card {
    width: 6.5rem;
    padding: 0.85rem 0.5rem;
    gap: 0.5rem;
  }

  .participants-card :deep(.p-avatar) {
    width: 3.25rem;
    height: 3.25rem;
    font-size: 1.5rem;
  }

  .participant-name {
    font-size: 0.78rem;
  }
}

/* ===== Topics ===== */
.topics-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  border: 1px solid var(--p-content-border-color);
  overflow: hidden;
}

.topic-row + .topic-row .topic-link,
.topic-row + .topic-row .topic-link-static {
  border-top: 1px solid var(--p-content-border-color);
}

.topic-link,
.topic-link-static {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 0.9rem;
  text-decoration: none;
  color: var(--p-text-color);
  transition:
    background-color 0.15s,
    color 0.15s;
}

.topic-link:hover,
.topic-link:focus-visible {
  background: var(--p-content-hover-background, rgba(0, 0, 0, 0.03));
  color: var(--p-primary-color);
}

.topic-time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
}

.topic-title {
  flex: 1;
  font-size: 0.92rem;
  line-height: 1.4;
  word-break: break-word;
}

.topic-icon {
  flex-shrink: 0;
  color: var(--p-text-muted-color);
  font-size: 1rem;
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 0.2s,
    transform 0.2s,
    color 0.2s;
}

.topic-link:hover .topic-icon,
.topic-link:focus-visible .topic-icon {
  opacity: 1;
  transform: translateX(0);
  color: var(--p-primary-color);
}

.app-dark .topic-time {
  /* background: rgba(255, 255, 255, 0.04); */
  background: var(--p-content-background);
}

/* ===== Related episodes (movie-poster cards) ===== */
.related-block :deep(.p-carousel-item) {
  padding: 0.5rem 0.4rem;
  box-sizing: border-box;
}

.related-block :deep(.p-carousel-content) {
  align-items: stretch;
}

.related-block :deep(.p-carousel-prev),
.related-block :deep(.p-carousel-next) {
  flex-shrink: 0;
}

.participants-block {
  max-width: 80rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.related-block {
  max-width: 80rem;
  padding-top: 1rem;
  padding-bottom: 3rem;
}

.poster-card {
  position: relative;
  display: block;
  color: inherit;
  text-decoration: none;
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.2s ease;
  will-change: transform;
}

@media (hover: hover) and (pointer: fine) {
  .poster-card:hover,
  .poster-card:focus-visible {
    transform: translateY(-4px);
    border-color: var(--p-primary-color);
    box-shadow: 0 18px 32px -18px rgba(0, 0, 0, 0.55);
  }

  .poster-card:hover .poster-image img,
  .poster-card:focus-visible .poster-image img {
    transform: scale(1.04);
  }
}

.poster-image {
  position: relative;
  aspect-ratio: 9 / 16;
  width: 100%;
  overflow: hidden;
  background: #0a0a10;
}

.poster-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  transition: transform 0.5s ease;
}

.poster-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.45);
}

.poster-fallback i {
  font-size: 2.5rem;
}

.poster-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 40%,
    rgba(0, 0, 0, 0.55) 75%,
    rgba(0, 0, 0, 0.92) 100%
  );
  pointer-events: none;
}

.poster-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0.85rem 0.85rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: #fff;
  z-index: 1;
}

.poster-date {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
  font-variant-numeric: tabular-nums;
  z-index: 1;
}

.poster-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
  z-index: 1;
}

@media (max-width: 768px) {
  .poster-title {
    font-size: 0.85rem;
  }

  .poster-overlay {
    padding: 0.65rem 0.7rem 0.75rem;
  }
}

@media (max-width: 640px) {
  .hero {
    min-height: clamp(24rem, 80vh, 36rem);
    padding: 4.5rem 1rem 6rem;
  }

  .hero::after {
    height: 7rem;
  }

  .hero-back {
    top: 0.85rem;
    left: 0.85rem;
    font-size: 0.8rem;
    padding: 0.35rem 0.75rem 0.35rem 0.55rem;
  }

  .hero-content {
    gap: 0.7rem;
  }

  .primary-action {
    padding: 0.6rem 1.15rem;
    font-size: 0.9rem;
  }

  .icon-action {
    width: 2.4rem;
    height: 2.4rem;
  }

  .topic-link,
  .topic-link-static {
    padding: 0.6rem 0.75rem;
    gap: 0.65rem;
  }

  .topic-title {
    font-size: 0.88rem;
  }
}
</style>
