// apps/web/app/composables/media/useWatchedMovie.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { HISTORY_QUERY_KEY } from "~/composables/history/useHistoryQuery";
import { isUnauthorized } from "../api/useApi";

export function useWatchedMovieAction(tmdbId: number, initialWatched: boolean) {
  const { apiFetch } = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const watched = ref(initialWatched);

  const mutation = useMutation<unknown, Error, boolean, { previous: boolean }>({
    mutationFn: (nextValue) =>
      nextValue
        ? apiFetch("/api/v1/history/movie", {
            method: "POST",
            body: { tmdbId },
          })
        : apiFetch(`/api/v1/history/movie/${tmdbId}`, { method: "DELETE" }),
    onMutate: (nextValue) => {
      const previous = watched.value;
      watched.value = nextValue;
      return { previous };
    },
    onError: (err, nextValue, context) => {
      if (context) watched.value = context.previous;
      if (isUnauthorized(err)) return;
      toast.error(
        t(
          nextValue
            ? "feedback.watched.markError"
            : "feedback.watched.unmarkError",
        ),
      );
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
    },
  });

  function toggle() {
    if (mutation.isPending.value) return;
    mutation.mutate(!watched.value);
  }

  return { watched, pending: mutation.isPending, toggle };
}
