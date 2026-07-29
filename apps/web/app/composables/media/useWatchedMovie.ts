// apps/web/app/composables/media/useWatchedMovie.ts
import { useMutation } from "@tanstack/vue-query";

export function useWatchedMovieAction(tmdbId: number, initialWatched: boolean) {
  const { apiFetch } = useApi();
  const { t } = useI18n();
  const toast = useToast();
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
    onError: (_err, _nextValue, context) => {
      if (context) watched.value = context.previous;
      toast.error(t("errors.generic"));
    },
  });

  function toggle() {
    if (mutation.isPending.value) return;
    mutation.mutate(!watched.value);
  }

  return { watched, pending: mutation.isPending, toggle };
}