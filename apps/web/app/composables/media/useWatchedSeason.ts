// apps/web/app/composables/media/useWatchedSeason.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { HISTORY_QUERY_KEY } from "../history/useHistoryQuery";

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
    } catch {
      const rollback = new Set(watchedSeasons.value);
      if (wasWatched) {
        rollback.add(seasonNumber);
      } else {
        rollback.delete(seasonNumber);
      }
      watchedSeasons.value = rollback;
      toast.error(t("errors.generic"));
    } finally {
      const donePending = new Set(pendingSeasons.value);
      donePending.delete(seasonNumber);
      pendingSeasons.value = donePending;
    }
  }

  return { isWatched, isPending, toggle };
}
