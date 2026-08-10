// apps/web/app/composables/watchlist/useWatchlistMutations.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { MediaType, WatchlistItemResponse } from "@foundit/types";
import { WATCHLIST_QUERY_KEY } from "./useWatchlistQuery";
import { isUnauthorized } from "../api/useApi";

interface RemoveVariables {
  tmdbId: number;
  mediaType: MediaType;
}

interface RemoveContext {
  previous: WatchlistItemResponse[] | undefined;
}

export function useRemoveFromWatchlistMutation() {
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ tmdbId, mediaType }: RemoveVariables) =>
      apiFetch(`/api/v1/watchlist/${tmdbId}/${mediaType}`, {
        method: "DELETE",
      }),
    onMutate: async ({
      tmdbId,
      mediaType,
    }: RemoveVariables): Promise<RemoveContext> => {
      await queryClient.cancelQueries({ queryKey: WATCHLIST_QUERY_KEY });
      const previous =
        queryClient.getQueryData<WatchlistItemResponse[]>(WATCHLIST_QUERY_KEY);
      queryClient.setQueryData<WatchlistItemResponse[]>(
        WATCHLIST_QUERY_KEY,
        (old) =>
          (old ?? []).filter(
            (item) => !(item.tmdbId === tmdbId && item.mediaType === mediaType),
          ),
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(WATCHLIST_QUERY_KEY, context.previous);
      }
      if (isUnauthorized(err)) return;
      toast.error(t("feedback.watchlist.removeError"));
    },
  });
}
