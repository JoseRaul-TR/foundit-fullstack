// apps/web/app/composables/watchlist/useWatchlistMutations.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type {
  MediaStateResponse,
  MediaType,
  WatchlistItemResponse,
} from "@foundit/types";
import { WATCHLIST_QUERY_KEY } from "./useWatchlistQuery";
import { MEDIA_STATE_QUERY_KEY } from "../profile/useMediaState";
import { isUnauthorized } from "../api/useApi";

interface ToggleVariables {
  tmdbId: number;
  mediaType: MediaType;
  add: boolean;
}

interface ToggleContext {
  previousState: MediaStateResponse | undefined;
  previousList: WatchlistItemResponse[] | undefined;
}

/**
 * The bookmark on a media card, and the only way the watchlist is written
 * from a list view. It replaced a remove-only mutation used solely by the
 * watchlist page: with the bookmark reading its state from the shared
 * media-state cache, one control does both directions everywhere.
 *
 * Unlike the per-item toggle behind the detail modal, this one holds no local
 * state — the card reads whether the item is on the list from that cache, so
 * the mutation has to patch it for the icon to change.
 */
export function useToggleWatchlistMutation() {
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const toast = useToast();

  return useMutation<unknown, Error, ToggleVariables, ToggleContext>({
    mutationFn: ({ tmdbId, mediaType, add }) =>
      add
        ? apiFetch("/api/v1/watchlist", {
            method: "POST",
            body: { tmdbId, mediaType },
          })
        : apiFetch(`/api/v1/watchlist/${tmdbId}/${mediaType}`, {
            method: "DELETE",
          }),

    onMutate: async ({ tmdbId, mediaType, add }): Promise<ToggleContext> => {
      await queryClient.cancelQueries({ queryKey: MEDIA_STATE_QUERY_KEY });

      const previousState = queryClient.getQueryData<MediaStateResponse>(
        MEDIA_STATE_QUERY_KEY,
      );
      const previousList =
        queryClient.getQueryData<WatchlistItemResponse[]>(WATCHLIST_QUERY_KEY);

      queryClient.setQueryData<MediaStateResponse>(
        MEDIA_STATE_QUERY_KEY,
        (old) => {
          if (!old) return old;
          const without = old.watchlist.filter(
            (item) => !(item.tmdbId === tmdbId && item.mediaType === mediaType),
          );
          return {
            ...old,
            watchlist: add ? [...without, { tmdbId, mediaType }] : without,
          };
        },
      );

      // Removing can be applied to the watchlist page optimistically; adding
      // cannot, because a full WatchlistItemResponse carries TMDB data this
      // client doesn't have. That asymmetry is the point of keeping the flags
      // in an ids-only payload: the icon flips instantly either way, and only
      // the watchlist page waits for a refetch.
      if (!add) {
        queryClient.setQueryData<WatchlistItemResponse[]>(
          WATCHLIST_QUERY_KEY,
          (old) =>
            (old ?? []).filter(
              (item) =>
                !(item.tmdbId === tmdbId && item.mediaType === mediaType),
            ),
        );
      }

      return { previousState, previousList };
    },

    // The rollback happens whatever the cause; the toast doesn't. On a 401
    // apiFetch has already signed the user out and moved them to the login
    // page, so a generic error would contradict what they're looking at.
    onError: (err, variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(MEDIA_STATE_QUERY_KEY, context.previousState);
      }
      if (context?.previousList) {
        queryClient.setQueryData(WATCHLIST_QUERY_KEY, context.previousList);
      }
      if (isUnauthorized(err)) return;
      toast.error(
        t(
          variables.add
            ? "feedback.watchlist.addError"
            : "feedback.watchlist.removeError",
        ),
      );
    },

    onSettled: (_data, _error, variables) => {
      if (variables.add) {
        void queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY });
      }
    },
  });
}
