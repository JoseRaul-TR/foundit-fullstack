// apps/web/app/composables/media/useWatchedSeason.ts
// Series no tiene un "watched" a nivel de show -- solo por temporada.
export function useSeasonWatchedAction(
  tmdbShowId: number,
  initialWatchedSeasons: Set<number>,
) {
  const { apiFetch } = useApi();
  const watchedSeasons = ref(new Set(initialWatchedSeasons));
  const pendingSeasons = ref(new Set<number>());

  function isWatched(seasonNumber: number) {
    return watchedSeasons.value.has(seasonNumber);
  }
  function isPending(seasonNumber: number) {
    return pendingSeasons.value.has(seasonNumber);
  }

  async function toggle(seasonNumber: number) {
    if (isPending(seasonNumber)) return;
    const wasWatched = isWatched(seasonNumber);

    pendingSeasons.value = new Set(pendingSeasons.value).add(seasonNumber);
    const optimistic = new Set(watchedSeasons.value);
    wasWatched ? optimistic.delete(seasonNumber) : optimistic.add(seasonNumber);
    watchedSeasons.value = optimistic;

    try {
      if (wasWatched) {
        await apiFetch(`/api/v1/history/season/${tmdbShowId}/${seasonNumber}`, {
          method: "DELETE",
        });
      } else {
        await apiFetch("/api/v1/history/season", {
          method: "POST",
          body: { tmdbShowId, seasonNumber },
        });
      }
    } catch {
      const rollback = new Set(watchedSeasons.value);
      wasWatched ? rollback.add(seasonNumber) : rollback.delete(seasonNumber);
      watchedSeasons.value = rollback;
    } finally {
      const donePending = new Set(pendingSeasons.value);
      donePending.delete(seasonNumber);
      pendingSeasons.value = donePending;
    }
  }

  return { isWatched, isPending, toggle };
}
