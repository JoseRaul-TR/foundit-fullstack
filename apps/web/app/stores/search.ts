// apps/web/app/stores/search.ts
import { defineStore } from "pinia";
import type { NormalizedSearchResult } from "@foundit/types";

// Annotated rather than inferred. Pinia takes the state's type from the
// initial values, so an unannotated `type: "multi"` becomes `string` and an
// unannotated `results: []` becomes `never[]`. The first widening travelled
// through useSearch()'s `computed(() => store.type)` into every consumer:
// SegmentedControl's generic resolved to `string` and its emit no longer
// matched changeType(). An interface fixes both without type assertions,
// which the lint rules reject here.
interface SearchState {
  query: string;
  type: SearchType;
  results: NormalizedSearchResult[];
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

const SEARCH_TYPES = ["multi", "movie", "series", "person"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

// The URL is the source of truth for the active filter, and a query string is
// whatever the user pasted into the address bar. Everything that reads `type`
// from there goes through this.
export function isSearchType(value: unknown): value is SearchType {
  return (
    typeof value === "string" &&
    (SEARCH_TYPES as readonly string[]).includes(value)
  );
}

export const useSearchStore = defineStore("search", {
  state: (): SearchState => ({
    query: "",
    type: "multi",
    results: [],
    page: 1,
    totalPages: 1,
    loading: false,
    error: null,
  }),
  getters: {
    hasMore: (state) => state.page < state.totalPages,
    isIdle: (state) => state.query.trim().length === 0,
  },
  actions: {
    reset() {
      this.results = [];
      this.page = 1;
      this.totalPages = 1;
      this.error = null;
    },
    clear() {
      this.query = "";
      // Clearing the box navigates back to `/`, which drops `type` from the
      // URL. Leaving it set here would keep the store announcing a filter no
      // address carries any more.
      this.type = "multi";
      this.reset();
    },
  },
});
