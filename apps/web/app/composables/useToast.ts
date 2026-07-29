// apps/web/app/composables/useToast.ts
export function useToast() {
  const store = useToastStore();

  return {
    success: (message: string) => store.push(message, "success"),
    error: (message: string) => store.push(message, "error"),
    info: (message: string) => store.push(message, "info"),
    dismiss: store.dismiss,
  };
}
