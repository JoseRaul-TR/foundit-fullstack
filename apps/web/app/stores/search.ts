// apps/web/app/stores/search.ts
import { defineStore } from "pinia";
import type { NormalizedSearchResult } from "@foundit/types";

export type SearchType = "multi" | "movie" | "series" | "person";

export const useSearchStore = defineStore("search", {
  state: () => ({
    query: "",
    type: "multi" as SearchType,
    results: [] as NormalizedSearchResult[],
    page: 1,
    totalPages: 1,
    loading: false,
    error: null as string | null,
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
