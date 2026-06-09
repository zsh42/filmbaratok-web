<script setup lang="ts"></script>

<template>
  <div class="hero-skeleton">
    <div class="hero-content-skeleton">
      <Skeleton width="7.5rem" height="1.5rem" border-radius="999px" class="eyebrow-skeleton" />
      <Skeleton width="60%" height="3rem" border-radius="6px" class="title-skeleton" />
      <Skeleton width="42%" height="1rem" border-radius="4px" class="participants-skeleton" />
      <Skeleton width="8rem" height="0.9rem" border-radius="4px" />
      <div class="actions-skeleton">
        <Skeleton width="7.5rem" height="2.5rem" border-radius="999px" />
        <Skeleton width="2.6rem" height="2.6rem" border-radius="999px" />
        <Skeleton width="2.6rem" height="2.6rem" border-radius="999px" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-skeleton {
  position: relative;
  overflow: hidden;
  width: 100vw;
  max-width: 1400px;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  min-height: clamp(24rem, 56vh, 38rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 4rem 1.5rem 5rem;
  background: var(--p-skeleton-background, rgba(0, 0, 0, 0.08));
  border-radius: 0;
}

@media (min-width: 1400px) {
  .hero-skeleton {
    width: 1400px;
    margin-left: calc((100% - 1400px) / 2);
    margin-right: calc((100% - 1400px) / 2);
    border-radius: 1rem;
  }
}

.hero-content-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  max-width: 48rem;
  text-align: center;
}

.eyebrow-skeleton {
  border-radius: 999px;
}

.title-skeleton {
  height: clamp(2rem, 4.5vw, 3.75rem);
}

.participants-skeleton {
  margin-top: 0.2rem;
}

.actions-skeleton {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.4rem;
}

@media (max-width: 640px) {
  .hero-skeleton {
    min-height: clamp(24rem, 80vh, 36rem);
    padding: 4.5rem 1rem 6rem;
  }
}
</style>
