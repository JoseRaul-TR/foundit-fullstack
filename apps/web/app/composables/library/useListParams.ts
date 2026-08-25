// apps/web/app/composables/library/useListParams.ts
//
// The filter and sort of a paginated list page, read from and written to the
// route. Shared by the watchlist and the history, which #234 made behave the
// same way apart from the watchlist having one more sort field.
//
// In the URL rather than in a ref, for three reasons: the back button undoes a
// filter change, a link to `?type=series` is shareable, and — the one that
// matters most here — the SSR prefetch can render exactly what the link asks
// for instead of always rendering the default view.
//
// Anything unrecognised falls back to the default rather than being forwarded.
// That is not defensive dressing: an old bookmark carrying `?sort=title` would
// now be rejected by the API with a 400 (#234 retired that sort), and a page
// that turns a stale link into an error page is worse than one that shows the
// default list.
import type { LocationQueryRaw } from "vue-router";
import type { SortDirection } from "@foundit/types";

export type ListTypeFilter = "all" | "movie" | "series";

export interface ListParams<S extends string> {
  type: ListTypeFilter;
  sort: S;
  order: SortDirection;
}

const TYPES = ["all", "movie", "series"] as const;
const ORDERS = ["asc", "desc"] as const;

const DEFAULT_TYPE: ListTypeFilter = "all";
const DEFAULT_ORDER: SortDirection = "desc";

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Call this from the page's setup body, *before* any await — like
 * `useLocale()`, it reads the Nuxt instance, and the prefetch below the await
 * needs its value to build the same query key the client will read (#192,
 * #211).
 */
export function useListParams<S extends string>(
  sorts: readonly S[],
  defaultSort: S,
) {
  const route = useRoute();
  const router = useRouter();

  const params = computed<ListParams<S>>(() => ({
    type: pick(route.query.type, TYPES, DEFAULT_TYPE),
    sort: pick(route.query.sort, sorts, defaultSort),
    order: pick(route.query.order, ORDERS, DEFAULT_ORDER),
  }));

  /**
   * push, not replace: the back button undoing a filter change is one of the
   * reasons this state is in the URL at all.
   *
   * A value equal to its default is removed rather than spelled out, so the
   * default view's URL is the bare path — which is what a link to "my
   * watchlist" should look like, and what the nav already points at.
   */
  function setParams(patch: Partial<ListParams<S>>) {
    const next = { ...params.value, ...patch };
    const query: LocationQueryRaw = { ...route.query };

    const put = (key: string, value: string, fallback: string) => {
      if (value === fallback) delete query[key];
      else query[key] = value;
    };

    put("type", next.type, DEFAULT_TYPE);
    put("sort", next.sort, defaultSort);
    put("order", next.order, DEFAULT_ORDER);

    void router.push({ query });
  }

  /**
   * The merged sort control: one select listing field and direction together,
   * as `"year:asc"`. Two separate controls would ask the user to combine them
   * mentally, and on the history — which sorts by one field — the direction
   * control would sit there with nothing beside it.
   */
  const sortValue = computed<string>({
    get: () => `${params.value.sort}:${params.value.order}`,
    set: (value) => {
      const [sort, order] = value.split(":");
      setParams({
        sort: pick(sort, sorts, defaultSort),
        order: pick(order, ORDERS, DEFAULT_ORDER),
      });
    },
  });

  return { params, setParams, sortValue };
}
