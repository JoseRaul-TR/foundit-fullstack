// apps/web/app/composables/useClickOutside.ts
//
// Minimal click-outside detection for dropdown/flyout menus (AvatarMenu,
// LanguageMenu). No @vueuse/core in this package yet, so implemented
// directly rather than adding a dependency for a single utility.
export function useClickOutside(
  target: Ref<HTMLElement | null>,
  onOutsideClick: () => void,
) {
  function handlePointerDown(event: MouseEvent) {
    const el = target.value;
    if (el && event.target instanceof Node && !el.contains(event.target)) {
      onOutsideClick();
    }
  }

  onMounted(() => {
    document.addEventListener("mousedown", handlePointerDown);
  });

  onUnmounted(() => {
    document.removeEventListener("mousedown", handlePointerDown);
  });
}
