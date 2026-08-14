// apps/web/app/composables/media/useMediaRecommendations.ts
import type { NormalizedSearchResult, PaginatedResponse } from "@foundit/types";

/**
 * The recommendations row, page 1 from the detail response and the rest from
 * the network as the user scrolls.
 *
 * Unlike cast and crew, this list has more behind it than what arrived: the
 * detail embeds TMDB's first page and TMDB has dozens more. So here the batch
 * is the request, and there's no second layer of DOM batching on top — twenty
 * media cards with lazy posters are not a problem worth two mechanisms.
 *
 * Deliberately a plain ref rather than useAsyncData: nothing here happens
 * during SSR, since the first page is already in the payload and the rest only
 * exists in response to a gesture.
 */
export function useMediaRecommendations(
  mediaType: "movie" | "series",
  id: number,
  firstPage: () => NormalizedSearchResult[],
  moreAvailable: () => boolean,
) {
  const { apiFetch } = useApi();
  const segment = mediaType === "movie" ? "movies" : "series";

  const extra = ref<NormalizedSearchResult[]>([]);
  const page = ref(1);
  const hasMore = ref(moreAvailable());
  const loading = ref(false);

  const items = computed(() => [...firstPage(), ...extra.value]);

  async function loadMore() {
    if (loading.value || !hasMore.value) return;
    loading.value = true;
    const next = page.value + 1;

    try {
      const response = await apiFetch<{
        success: boolean;
        data: PaginatedResponse<NormalizedSearchResult>;
      }>(`/api/v1/${segment}/${id}/recommendations`, {
        query: { page: next },
      });

      // TMDB reorders by popularity between requests, so a title on page 1 can
      // reappear on page 3. Two cards for one film is bad enough; duplicate
      // keys in a v-for are worse.
      const seen = new Set(items.value.map((item) => item.id));
      extra.value.push(
        ...response.data.results.filter((item) => !seen.has(item.id)),
      );

      page.value = next;
      hasMore.value = next < response.data.totalPages;
    } catch {
      // No toast. What's already drawn stays, and an error about content the
      // user never asked for by name is noise — a 401 has already taken them
      // to the login page from inside apiFetch. Just stop asking.
      hasMore.value = false;
    } finally {
      loading.value = false;
    }
  }

  return { items, hasMore, loading, loadMore };
}
