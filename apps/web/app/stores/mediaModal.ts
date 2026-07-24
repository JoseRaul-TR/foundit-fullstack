// apps/web/app/stores/mediaModal.ts
import { defineStore } from "pinia";

export type ModalMediaType = "movie" | "series" | "person";

interface ModalHistoryEntry {
  id: number;
  mediaType: ModalMediaType;
}

export const useMediaModalStore = defineStore("mediaModal", {
  state: () => ({
    history: [] as ModalHistoryEntry[],
  }),
  getters: {
    isOpen: (state) => state.history.length > 0,
    current: (state) => state.history[state.history.length - 1] ?? null,
    canGoBack: (state) => state.history.length > 1,
  },
  actions: {
    open(id: number, mediaType: ModalMediaType) {
      this.history.push({ id, mediaType });
    },
    back() {
      if (this.history.length > 1) {
        this.history.pop();
      } else {
        this.close();
      }
    },
    close() {
      this.history = [];
    },
  },
});
