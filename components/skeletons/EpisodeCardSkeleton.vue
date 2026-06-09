<script setup lang="ts"></script>

<template>
  <div class="episode-card-skeleton">
    <div class="banner-skeleton">
      <Skeleton width="100%" height="100%" border-radius="0" />
    </div>
    <div class="body-skeleton">
      <div class="chips-skeleton">
        <Skeleton width="4rem" height="1.5rem" border-radius="999px" />
        <Skeleton width="3.5rem" height="1.5rem" border-radius="999px" />
        <Skeleton width="4.5rem" height="1.5rem" border-radius="999px" />
      </div>
      <div class="divider-skeleton" />
      <Skeleton width="72%" height="1rem" border-radius="4px" />
      <Skeleton width="54%" height="1rem" border-radius="4px" />
      <Skeleton width="32%" height="0.8rem" border-radius="4px" class="date-skeleton" />
    </div>
  </div>
</template>

<style scoped>
.episode-card-skeleton {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius-md, 6px);
  overflow: hidden;
  background: var(--p-content-background);
  height: 100%;
}

.banner-skeleton {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
}

.body-skeleton {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.chips-skeleton {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.divider-skeleton {
  height: 1px;
  background: var(--p-content-border-color);
  margin: 0.1rem 0;
  border-style: dashed;
  border-width: 0 0 1px;
  border-color: var(--p-content-border-color);
}

.date-skeleton {
  margin-top: 0.15rem;
}
</style>
