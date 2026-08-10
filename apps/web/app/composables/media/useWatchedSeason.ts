// apps/web/app/composables/media/useWatchedSeason.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { HISTORY_QUERY_KEY } from "../history/useHistoryQuery";
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
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
    },
  });

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

    try {
      await mutation.mutateAsync({ seasonNumber, nextValue: !wasWatched });
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
    }
  }

  /**
   * Marking a whole series lives here rather than in the component because the
   * feedback has to be aggregate: calling toggle() in a loop produced one toast
   * per season, so an eleven-season series reported a single failed intent
   * eleven times.
   *
   * allSettled rather than all: Promise.all rejects on the first failure while
   * the rest keep going, which would leave us rolling back seasons that
   * actually succeeded. Here only the ones that failed revert.
   *
   * The requests still go out in parallel with no way to abort — see #145,
   * where that's tracked separately. This function is where that would change.
   */
  async function markAllWatched(seasonNumbers: number[]) {
    const target = seasonNumbers.filter((n) => !isWatched(n) && !isPending(n));
    if (target.length === 0) return;

    pendingSeasons.value = new Set([...pendingSeasons.value, ...target]);
    const optimistic = new Set(watchedSeasons.value);
    for (const n of target) optimistic.add(n);
    watchedSeasons.value = optimistic;

    try {
      const results = await Promise.allSettled(
        target.map((seasonNumber) =>
          mutation.mutateAsync({ seasonNumber, nextValue: true }),
        ),
      );

      const failed: number[] = [];
      let firstError: unknown;

      results.forEach((result, index) => {
        if (result.status !== "rejected") return;
        const seasonNumber = target[index];
        if (seasonNumber !== undefined) failed.push(seasonNumber);
        firstError ??= result.reason;
      });

      if (failed.length === 0) return;

      const rollback = new Set(watchedSeasons.value);
      for (const n of failed) rollback.delete(n);
      watchedSeasons.value = rollback;

      if (isUnauthorized(firstError)) return;
      toast.error(t("feedback.season.allError"));
    } finally {
      const donePending = new Set(pendingSeasons.value);
      for (const n of target) donePending.delete(n);
      pendingSeasons.value = donePending;
    }
  }

  return { isWatched, isPending, toggle, markAllWatched };
}
