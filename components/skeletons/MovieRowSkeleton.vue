<script setup lang="ts"></script>

<template>
  <div class="movie-row-skeleton">
    <div class="poster-cell">
      <Skeleton width="3.125rem" height="4.375rem" border-radius="4px" />
    </div>
    <div class="text-cell">
      <Skeleton width="52%" height="1rem" border-radius="4px" />
      <Skeleton width="30%" height="0.8rem" border-radius="4px" class="subtitle-skeleton" />
    </div>
    <div class="status-cell">
      <Skeleton width="4.5rem" height="1.5rem" border-radius="999px" />
    </div>
  </div>
</template>

<style scoped>
.movie-row-skeleton {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--p-content-border-color);
  min-height: 5.5rem;
  background: var(--p-content-background);
}

.poster-cell {
  flex-shrink: 0;
}

.text-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.subtitle-skeleton {
  margin-top: 0.1rem;
}

.status-cell {
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .status-cell {
    display: none;
  }
}
</style>
