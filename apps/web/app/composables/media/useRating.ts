// apps/web/app/composables/media/useRating.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { HISTORY_QUERY_KEY } from "~/composables/history/useHistoryQuery";
import { isUnauthorized } from "../api/useApi";

export function useRatingAction(
  tmdbId: number,
  mediaType: "movie" | "series",
  initialRating: number | null,
) {
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const toast = useToast();
  const rating = ref(initialRating);

  const mutation = useMutation({
    mutationFn: (value: number | null) =>
      value === null
        ? apiFetch(`/api/v1/ratings/${tmdbId}/${mediaType}`, {
            method: "DELETE",
          })
        : apiFetch("/api/v1/ratings", {
            method: "POST",
            body: { tmdbId, mediaType, rating: value },
          }),
    onMutate: (value: number | null): { previous: number | null } => {
      const previous = rating.value;
      rating.value = value; // optimistic
      return { previous };
    },
    // value === null is the "remove my rating" path; anything else is a save.
    onError: (err, value, context) => {
      if (context) rating.value = context.previous;
      if (isUnauthorized(err)) return;
      toast.error(
        t(
          value === null
            ? "feedback.rating.removeError"
            : "feedback.rating.saveError",
        ),
      );
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY });
    },
  });

  function setRating(value: number | null) {
    if (mutation.isPending.value) return;
    mutation.mutate(value);
  }

  return { rating, pending: mutation.isPending, setRating };
}
