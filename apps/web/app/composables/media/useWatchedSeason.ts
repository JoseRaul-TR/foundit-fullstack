// apps/web/app/composables/media/useWatchedSeason.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { HISTORY_QUERY_KEY } from "../history/useHistoryQuery";
import { MEDIA_STATE_QUERY_KEY } from "../profile/useMediaState";
import { isUnauthorized } from "../api/useApi";

interface ToggleSeasonInput {
  seasonNumber: number;
  nextValue: boolean;
}

export function useSeasonWatchedAction(
  tmdbShowId: number,
  initialWatchedSeasons: Set<number>,
) {
  const { apiFetch } = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const watchedSeasons = ref(new Set(initialWatchedSeasons));
  const pendingSeasons = ref(new Set<number>());

  const mutation = useMutation({
    mutationFn: ({ seasonNumber, nextValue }: ToggleSeasonInput) =>
      nextValue
        ? apiFetch("/api/v1/history/season", {
            method: "POST",
            body: { tmdbShowId, seasonNumber },
          })
        : apiFetch(`/api/v1/history/season/${tmdbShowId}/${seasonNumber}`, {
            method: "DELETE",
          }),
    // No onSuccess here on purpose. Invalidating per call meant a bulk change
    // over eleven seasons refetched the entire history eleven times. The
    // callers below invalidate once, when they're done.
  });

  function invalidateWatchedState() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MEDIA_STATE_QUERY_KEY }),
    ]);
  }

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
    if (wasWatched) {
      optimistic.delete(seasonNumber);
    } else {
      optimistic.add(seasonNumber);
    }
    watchedSeasons.value = optimistic;

    let completed = false;
    try {
      await mutation.mutateAsync({ seasonNumber, nextValue: !wasWatched });
      completed = true;
    } catch (err) {
      const rollback = new Set(watchedSeasons.value);
      if (wasWatched) {
        rollback.add(seasonNumber);
      } else {
        rollback.delete(seasonNumber);
      }
      watchedSeasons.value = rollback;
      if (isUnauthorized(err)) return;

      toast.error(
        t(
          wasWatched
            ? "feedback.season.unmarkError"
            : "feedback.season.markError",
          { season: seasonNumber },
        ),
      );
    } finally {
      const donePending = new Set(pendingSeasons.value);
      donePending.delete(seasonNumber);
      pendingSeasons.value = donePending;
      if (completed) await invalidateWatchedState();
    }
  }

  /**
   * Marking or unmarking a whole series lives here rather than in the
   * component because the feedback has to be aggregate: calling toggle() in a
   * loop produced one toast per season, so an eleven-season series reported a
   * single failed intent eleven times.
   *
   * Sequential, and it stops at the first failure. In parallel an eleven-season
   * series fired eleven requests at once, and an expired session answered all
   * eleven with a 401 — each one independently clearing the session and asking
   * for the same navigation. Stopping early also means a failure rolls back
   * only what didn't happen, and leaves what did.
   */
  async function setAllWatched(seasonNumbers: number[], nextValue: boolean) {
    const target = seasonNumbers.filter(
      (n) => isWatched(n) !== nextValue && !isPending(n),
    );
    if (target.length === 0) return;

    pendingSeasons.value = new Set([...pendingSeasons.value, ...target]);
    const optimistic = new Set(watchedSeasons.value);
    for (const n of target) {
      if (nextValue) optimistic.add(n);
      else optimistic.delete(n);
    }
    watchedSeasons.value = optimistic;

    const completed = new Set<number>();

    try {
      for (const seasonNumber of target) {
        await mutation.mutateAsync({ seasonNumber, nextValue });
        completed.add(seasonNumber);
      }
    } catch (err) {
      const rollback = new Set(watchedSeasons.value);
      for (const n of target) {
        if (completed.has(n)) continue;
        if (nextValue) rollback.delete(n);
        else rollback.add(n);
      }
      watchedSeasons.value = rollback;

      if (!isUnauthorized(err)) {
        toast.error(
          t(
            nextValue
              ? "feedback.season.allError"
              : "feedback.season.allUnmarkError",
          ),
        );
      }
    } finally {
      const donePending = new Set(pendingSeasons.value);
      for (const n of target) donePending.delete(n);
      pendingSeasons.value = donePending;
      if (completed.size > 0) await invalidateWatchedState();
    }
  }

  function markAllWatched(seasonNumbers: number[]) {
    return setAllWatched(seasonNumbers, true);
  }

  function unmarkAllWatched(seasonNumbers: number[]) {
    return setAllWatched(seasonNumbers, false);
  }

  return {
    isWatched,
    isPending,
    toggle,
    markAllWatched,
    unmarkAllWatched,
  };
}
