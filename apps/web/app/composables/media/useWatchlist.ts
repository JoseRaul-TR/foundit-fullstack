// apps/web/app/composables/media/useWatchlist.ts
import { useMutation } from "@tanstack/vue-query";
import { isUnauthorized } from "../api/useApi";

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
    // The rollback happens whatever the cause; the toast doesn't. On a 401
    // apiFetch has already signed the user out and moved them to the login
    // page, so a generic error message would contradict what they're seeing.
    //
    // nextValue tells us which direction the user was going, so the message
    // can name the action they just watched come undone.
    onError: (err, nextValue, context) => {
      if (context) inWatchlist.value = context.previous;
      if (isUnauthorized(err)) return;
      toast.error(
        t(
          nextValue
            ? "feedback.watchlist.addError"
            : "feedback.watchlist.removeError",
        ),
      );
    },
  });

  function toggle() {
    if (mutation.isPending.value) return;
    mutation.mutate(!inWatchlist.value);
  }

  return { inWatchlist, pending: mutation.isPending, toggle };
}
