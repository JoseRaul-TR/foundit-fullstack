// apps/web/app/composables/useMediaModal.ts
import { storeToRefs } from "pinia";
import { useMediaModalStore, type ModalMediaType } from "~/stores/mediaModal";

export function useMediaModal() {
  const store = useMediaModalStore();
  const { isOpen, current, canGoBack } = storeToRefs(store);

  return {
    isOpen,
    current,
    canGoBack,
    open: (id: number, mediaType: ModalMediaType) => store.open(id, mediaType),
    back: () => store.back(),
    close: () => store.close(),
  };
}
