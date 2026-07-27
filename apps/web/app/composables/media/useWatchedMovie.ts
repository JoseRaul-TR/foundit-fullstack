// apps/web/app/composables/media/useWatchedMovie.ts
// Movie-only: marks the whole movie watched via /history/movie.
// Series has no equivalent top-level action — only per-season (task #5).
export function useWatchedMovieAction(tmdbId: number, initialWatched: boolean) {
  const { apiFetch } = useApi();
  const watched = ref(initialWatched);
  const pending = ref(false);

  async function toggle() {
    if (pending.value) return;
    const previous = watched.value;
    watched.value = !previous;
    pending.value = true;
    try {
      if (previous) {
        await apiFetch(`/api/v1/history/movie/${tmdbId}`, { method: "DELETE" });
      } else {
        await apiFetch("/api/v1/history/movie", {
          method: "POST",
          body: { tmdbId },
        });
      }
    } catch {
      watched.value = previous;
    } finally {
      pending.value = false;
    }
  }

  return { watched, pending, toggle };
}
