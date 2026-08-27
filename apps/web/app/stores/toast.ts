// apps/web/app/stores/toast.ts
import { defineStore } from "pinia";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

export const useToastStore = defineStore("toast", () => {
  const toasts = ref<Toast[]>([]);

  // Inside the setup, not at module scope. Module scope is shared across
  // requests on the server, so a counter there is cross-request state rather
  // than per-store state. It happens not to matter for toasts — they are only
  // ever raised on the client — but the same shape in a store holding user data
  // would leak one visitor's into another's render.
  //
  // Deliberately not a ref: nothing renders it, and making it reactive would
  // add a dependency to every component that raises a toast for no gain.
  let nextId = 0;

  function push(
    message: string,
    variant: ToastVariant = "info",
    duration = 4000,
  ) {
    const id = ++nextId;
    toasts.value.push({ id, message, variant });
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts, push, dismiss };
});
