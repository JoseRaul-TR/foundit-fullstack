// apps/web/app/stores/search.ts
import { defineStore } from "pinia";
import type { NormalizedSearchResult } from "@foundit/types";

export type SearchType = "multi" | "movie" | "series" | "person";

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
      this.reset();
    },
  },
});
