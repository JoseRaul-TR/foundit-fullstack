// apps/web/app/composables/media/useWatchlist.ts
export function useWatchlistAction(
  tmdbId: number,
  mediaType: "movie" | "series",
  initialInWatchlist: boolean,
) {
  const { apiFetch } = useApi();
  const inWatchlist = ref(initialInWatchlist);
  const pending = ref(false);

  async function toggle() {
    if (pending.value) return;
    const previous = inWatchlist.value;
    inWatchlist.value = !previous; // optimistic
    pending.value = true;
    try {
      if (previous) {
        await apiFetch(`/api/v1/watchlist/${tmdbId}/${mediaType}`, {
          method: "DELETE",
        });
      } else {
        await apiFetch("/api/v1/watchlist", {
          method: "POST",
          body: { tmdbId, mediaType },
        });
      }
    } catch {
      inWatchlist.value = previous; // rollback
    } finally {
      pending.value = false;
    }
  }

  return { inWatchlist, pending, toggle };
}
