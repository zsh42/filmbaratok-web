<script setup lang="ts"></script>

<template>
  <article class="movie-detail-skeleton">
    <div class="breadcrumb-skeleton">
      <Skeleton width="8rem" height="0.9rem" border-radius="4px" />
    </div>

    <div class="header-skeleton">
      <Skeleton width="62%" height="2rem" border-radius="6px" />
      <Skeleton width="22rem" height="0.9rem" border-radius="4px" class="subtitle-skeleton" />
    </div>

    <div class="body-skeleton">
      <div class="poster-skeleton">
        <Skeleton width="100%" height="100%" border-radius="6px" />
      </div>

      <div class="meta-skeleton">
        <div class="meta-row-skeleton">
          <Skeleton width="5rem" height="0.7rem" border-radius="3px" />
          <Skeleton width="8rem" height="1rem" border-radius="4px" />
        </div>
        <div class="meta-row-skeleton">
          <Skeleton width="5rem" height="0.7rem" border-radius="3px" />
          <Skeleton width="11rem" height="1rem" border-radius="4px" />
        </div>
        <div class="meta-row-skeleton">
          <Skeleton width="5rem" height="0.7rem" border-radius="3px" />
          <Skeleton width="100%" height="1rem" border-radius="4px" />
          <Skeleton width="90%" height="1rem" border-radius="4px" />
          <Skeleton width="75%" height="1rem" border-radius="4px" />
        </div>
        <div class="actions-skeleton">
          <Skeleton width="9rem" height="2rem" border-radius="999px" />
          <Skeleton width="7rem" height="2rem" border-radius="999px" />
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.movie-detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 56rem;
  margin: 0 auto;
}

.breadcrumb-skeleton {
  height: 1.2rem;
  display: flex;
  align-items: center;
}

.header-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subtitle-skeleton {
  max-width: 22rem;
}

.body-skeleton {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  padding-top: 0.5rem;
}

.poster-skeleton {
  flex-shrink: 0;
  width: 200px;
  aspect-ratio: 2 / 3;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--p-content-border-color);
}

.meta-skeleton {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.meta-row-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.actions-skeleton {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

@media (max-width: 640px) {
  .body-skeleton {
    flex-direction: column;
  }

  .poster-skeleton {
    width: 100%;
    aspect-ratio: unset;
    height: 15rem;
  }
}

@media (max-width: 768px) {
  .subtitle-skeleton {
    max-width: 100%;
  }
}
</style>
