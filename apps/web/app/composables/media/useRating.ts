// apps/web/app/composables/media/useRating.ts
export function useRatingAction(
  tmdbId: number,
  mediaType: "movie" | "series",
  initialRating: number | null,
) {
  const { apiFetch } = useApi();
  const rating = ref(initialRating);
  const pending = ref(false);

  async function setRating(value: number) {
    if (pending.value) return;
    const previous = rating.value;
    rating.value = value; // optimistic
    pending.value = true;
    try {
      await apiFetch("/api/v1/ratings", {
        method: "POST",
        body: { tmdbId, mediaType, rating: value },
      });
    } catch {
      rating.value = previous;
    } finally {
      pending.value = false;
    }
  }

  return { rating, pending, setRating };
}
