<!-- apps/web/app/components/media-detail/MediaDetailsModal.vue -->
<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-page/80 px-4 py-8 backdrop-blur-sm sm:py-12"
      @click.self="close"
    >
      <div class="relative w-full max-w-3xl rounded-2xl border border-border bg-surface shadow-2xl">
        <div class="sticky top-4 z-20 flex items-center justify-between px-4 sm:px-6">
          <button
            v-if="canGoBack"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-page/80 text-primary shadow-md backdrop-blur-md transition hover:border-border hover:bg-page"
            @click="back"
          >
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span v-else />

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-page/80 text-primary shadow-md backdrop-blur-md transition hover:border-border hover:bg-page"
            @click="close"
          >
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="-mt-[52px]">
          <template v-if="current">
            <MovieDetailContent
              v-if="current.mediaType === 'movie'"
              :key="`movie-${current.id}`"
              :id="current.id"
            />
            <SeriesDetailContent
              v-else-if="current.mediaType === 'series'"
              :key="`series-${current.id}`"
              :id="current.id"
            />
            <PersonDetailContent
              v-else
              :key="`person-${current.id}`"
              :id="current.id"
            />
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const { isOpen, current, canGoBack, back, close } = useMediaModal();

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && isOpen.value) close();
}

onMounted(() => document.addEventListener("keydown", handleKeydown));
onUnmounted(() => document.removeEventListener("keydown", handleKeydown));
</script>