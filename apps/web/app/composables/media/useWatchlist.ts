// apps/web/app/composables/media/useWatchlist.ts
import { useMutation } from "@tanstack/vue-query";

export function useWatchlistAction(
  tmdbId: number,
  mediaType: "movie" | "series",
  initialInWatchlist: boolean,
) {
  const { apiFetch } = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const inWatchlist = ref(initialInWatchlist);

  const mutation = useMutation<unknown, Error, boolean, { previous: boolean }>({
    mutationFn: (nextValue) =>
      nextValue
        ? apiFetch("/api/v1/watchlist", {
            method: "POST",
            body: { tmdbId, mediaType },
          })
        : apiFetch(`/api/v1/watchlist/${tmdbId}/${mediaType}`, {
            method: "DELETE",
          }),
    onMutate: (nextValue) => {
      const previous = inWatchlist.value;
      inWatchlist.value = nextValue;
      return { previous };
    },
    onError: (_err, _nextValue, context) => {
      if (context) inWatchlist.value = context.previous;
      toast.error(t("errors.generic"));
    },
  });

  function toggle() {
    if (mutation.isPending.value) return;
    mutation.mutate(!inWatchlist.value);
  }

  return { inWatchlist, pending: mutation.isPending, toggle };
}
