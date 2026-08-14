// apps/web/app/composables/ui/useInView.ts
/**
 * True once the element has come into view, and true from then on.
 *
 * An animation bound to mount plays where nobody is looking. The providers
 * section sits below the backdrop, the poster and the metadata, so on a phone
 * it is a screen and a half from where the modal opens — the three runs are
 * over before it is scrolled to.
 *
 * It never returns to false. Scrolling past the same marker twice is not two
 * pieces of news, and replaying on every pass would turn a signal into a
 * strobe.
 */
export function useInView() {
  const target = ref<HTMLElement | null>(null);
  const seen = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    const el = target.value;
    if (!el) return;

    // Without an observer, show the marker at rest rather than hide the state
    // behind a feature the browser doesn't have.
    if (!("IntersectionObserver" in window)) {
      seen.value = true;
      return;
    }

    // threshold 0 rather than a fraction: the section can be taller than the
    // viewport, and a section that never fits would never reach 0.5. The
    // negative bottom margin is what stops it firing on the single row of
    // pixels peeking over the fold.
    //
    // The root stays the viewport even though this lives inside the modal:
    // the modal's scroller is `fixed inset-0`, so it *is* the viewport, and
    // anything it clips is off-screen anyway.
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        seen.value = true;
        observer?.disconnect();
      },
      { threshold: 0, rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(el);
  });

  onUnmounted(() => observer?.disconnect());

  return { target, seen };
}
