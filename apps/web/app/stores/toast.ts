// apps/web/app/stores/toast.ts
import { defineStore } from "pinia";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

let nextId = 0;

export const useToastStore = defineStore("toast", () => {
  const toasts = ref<Toast[]>([]);

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
