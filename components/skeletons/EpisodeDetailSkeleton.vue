<script setup lang="ts"></script>

<template>
  <article class="episode-detail-skeleton">
    <div class="hero-skeleton">
      <Skeleton width="100%" height="100%" border-radius="0" />
    </div>

    <div class="content-skeleton">
      <Skeleton width="82%" height="2.5rem" border-radius="6px" class="title-skeleton" />
      <Skeleton width="42%" height="1rem" border-radius="4px" class="meta-skeleton" />
      <div class="description-skeleton">
        <Skeleton width="100%" height="1rem" border-radius="4px" />
        <Skeleton width="95%" height="1rem" border-radius="4px" />
        <Skeleton width="100%" height="1rem" border-radius="4px" />
        <Skeleton width="80%" height="1rem" border-radius="4px" />
        <Skeleton width="60%" height="1rem" border-radius="4px" />
      </div>
      <div class="actions-skeleton">
        <Skeleton width="7.5rem" height="2.5rem" border-radius="999px" />
        <Skeleton width="2.6rem" height="2.6rem" border-radius="999px" />
        <Skeleton width="2.6rem" height="2.6rem" border-radius="999px" />
      </div>
    </div>
  </article>
</template>

<style scoped>
.episode-detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.hero-skeleton {
  aspect-ratio: 16 / 9;
  width: 100%;
  max-height: 44rem;
  overflow: hidden;
}

.content-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 2rem 1.5rem;
  max-width: 48rem;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.title-skeleton {
  height: clamp(2rem, 4vw, 2.5rem);
}

.meta-skeleton {
  margin-top: 0.25rem;
}

.description-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.5rem;
}

.actions-skeleton {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .content-skeleton {
    padding: 1.5rem 1rem;
  }
}

@media (max-width: 640px) {
  .hero-skeleton {
    max-height: 36rem;
  }

  .content-skeleton {
    padding: 1rem 0.75rem;
  }
}
</style>
