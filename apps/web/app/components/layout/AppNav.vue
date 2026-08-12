<!-- apps/web/app/components/layout/AppNav.vue -->
<!-- Header-Navbar, Figma 277:401, with three deliberate departures.
     - The app name is hidden below `sm`. The wireframe shows it at 375px, but
       there it competes for room with two nav links and the avatar, and space
       wins over the drawing.
     - The nav track is sized by its contents rather than the wireframe's fixed
       289px. That width was drawn around "Watchlist" and "History"; the same
       links are "Min lista"/"Historik" and "Mi lista"/"Historial", and a fixed
       width either overflows or leaves a gap depending on the locale.
     - The bar is translucent with a blur instead of opaque. It has to have a
       background now that it hides and reappears — content showing through a
       returning bar reads as a paint bug — and a translucent layer reads as
       something floating above the page rather than a patch over it. -->
<template>
  <header
    class="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 bg-page/85 px-3 py-3 backdrop-blur-xl transition-transform duration-300 motion-reduce:transition-none sm:px-8 sm:py-3.5"
    :class="hidden ? '-translate-y-full' : 'translate-y-0'"
  >
    <nav
      ref="rootRef"
      class="relative flex items-center gap-1 rounded-full bg-surface-elevated p-1.5 shadow-[0_4px_4px_rgba(0,0,0,0.25)] sm:gap-2 sm:p-2"
    >
      <!-- The "you are here" marker, and the only one: the logo has no pill of
           its own any more, it borrows this one when Home is the active route.
           On mobile the app name is hidden, so this pill is the whole signal
           there rather than a reinforcement of the gold text.

           Filled with `page`, the darkest colour in the palette and the same
           one as the bar behind the track — so it reads as a hole punched
           through a raised strip rather than a fourth colour introduced for
           the occasion. It also puts the gold label and the gold halo against
           near-black, which is the most contrast this palette can give them.
           The inset highlight along the top edge is what keeps it from looking
           like a gap: a lit rim says surface, an unlit one says absence. -->
      <span
        v-if="thumb.ready"
        class="pointer-events-none absolute inset-y-1.5 rounded-full bg-page shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_-6px_#e8a33d] sm:inset-y-2 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_30px_-4px_#e8a33d]"
        :class="
          animate
            ? 'transition-[left,width] duration-200 ease-out motion-reduce:transition-none'
            : ''
        "
        :style="{ left: `${thumb.left}px`, width: `${thumb.width}px` }"
        aria-hidden="true"
      />

      <!-- hover:scale is transform-only, so nothing reflows: neighbours stay
           put and the thumb's measurements remain valid. The active item is
           excluded — the thumb doesn't scale with it, so growing would push
           the text out of its own background. -->
      <NuxtLink
        data-thumb-item
        :to="localePath('/')"
        class="relative z-10 flex items-center gap-2 rounded-full px-2.5 py-1.5 transition-transform duration-150 motion-reduce:transition-none sm:px-3 sm:py-2"
        :class="isHomeActive ? '' : 'hover:scale-105'"
        :aria-current="isHomeActive ? 'page' : undefined"
      >
        <span
          class="h-7 w-7 shrink-0 rounded-lg bg-[linear-gradient(45deg,_#e8a33d_14.286%,_#c9791f_85.714%)]"
        />
        <span
          class="hidden whitespace-nowrap text-xl font-bold sm:inline"
          :class="isHomeActive ? 'text-brand' : 'text-primary'"
        >
          {{ appName }}
        </span>
      </NuxtLink>

      <template v-if="authStore.isAuthenticated">
        <NuxtLink
          data-thumb-item
          :to="localePath('/watchlist')"
          class="relative z-10 whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm transition-transform duration-150 motion-reduce:transition-none sm:px-4 sm:py-2"
          :class="
            isWatchlistActive
              ? 'font-bold text-brand'
              : 'font-medium text-secondary hover:scale-105 hover:text-primary'
          "
          :aria-current="isWatchlistActive ? 'page' : undefined"
        >
          {{ $t("nav.watchlist") }}
        </NuxtLink>
        <NuxtLink
          data-thumb-item
          :to="localePath('/history')"
          class="relative z-10 whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm transition-transform duration-150 motion-reduce:transition-none sm:px-4 sm:py-2"
          :class="
            isHistoryActive
              ? 'font-bold text-brand'
              : 'font-medium text-secondary hover:scale-105 hover:text-primary'
          "
          :aria-current="isHistoryActive ? 'page' : undefined"
        >
          {{ $t("nav.history") }}
        </NuxtLink>
      </template>
    </nav>

    <div
      v-if="authStore.isAuthenticated"
      ref="avatarWrapperRef"
      class="relative"
    >
      <!-- Two things kept this from reading like the nav pill's halo, and it
           needed both fixed.
           
           The drop shadow is dropped while active: shadows in a list paint
           front to back, so a dark one listed first sits on top of the halo
           and swallows its lower half. The pill never had that problem — its
           first shadow is an inset, which doesn't interfere.
           
           And the geometry is the pill's inverted. A negative spread shrinks
           the light source before blurring it; on a 140px pill that's a minor
           trim, on a 34px circle it leaves almost nothing to spread over 26px
           of blur. So this one grows the source instead of shrinking it, and
           carries its gold at 0.8 rather than full alpha over a smaller
           radius. Same intent, opposite numbers, on purpose. -->
      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-page transition-transform duration-150 motion-reduce:transition-none sm:h-[34px] sm:w-[34px] sm:text-[13px]"
        :class="
          isProfileActive
            ? 'shadow-[0_0_18px_2px_rgba(232,163,61,0.8)] sm:shadow-[0_0_26px_4px_rgba(232,163,61,0.8)]'
            : 'shadow-[0_4px_4px_rgba(0,0,0,0.25)] hover:scale-105'
        "
        :aria-current="isProfileActive ? 'page' : undefined"
        @click="avatarMenuOpen = !avatarMenuOpen"
      >
        {{ initials }}
      </button>

      <AvatarMenu
        v-if="avatarMenuOpen"
        class="absolute right-0 top-full mt-2"
        @close="avatarMenuOpen = false"
      />
    </div>

    <div v-else class="flex items-center gap-3 sm:gap-[18px]">
      <NuxtLink
        :to="localePath('/login')"
        class="whitespace-nowrap text-[13px] font-medium text-secondary transition-colors hover:text-primary sm:text-sm"
      >
        {{ $t("nav.login") }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/register')"
        class="whitespace-nowrap rounded-full bg-brand/32 px-5 py-2.5 text-[13px] font-bold text-brand transition hover:brightness-110"
      >
        {{ $t("nav.register") }}
      </NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
const {
  public: { appName },
} = useRuntimeConfig();

const localePath = useLocalePath();
const authStore = useAuthStore();
const route = useRoute();

const avatarMenuOpen = ref(false);
const avatarWrapperRef = ref<HTMLElement | null>(null);

useClickOutside(avatarWrapperRef, () => {
  avatarMenuOpen.value = false;
});

const routeBaseName = computed(() => route.name?.toString().split("___")[0]);

const isHomeActive = computed(() => routeBaseName.value === "index");
const isWatchlistActive = computed(
  () => authStore.isAuthenticated && routeBaseName.value === "watchlist",
);
const isHistoryActive = computed(
  () => authStore.isAuthenticated && routeBaseName.value === "history",
);
const isProfileActive = computed(
  () => authStore.isAuthenticated && routeBaseName.value === "profile",
);

// -1 on any route the nav doesn't cover — /profile, the auth pages — so the
// thumb disappears instead of claiming a section the user isn't in.
const activeIndex = computed(() => {
  if (isHomeActive.value) return 0;
  if (isWatchlistActive.value) return 1;
  if (isHistoryActive.value) return 2;
  return -1;
});

const { rootRef, thumb, animate, measure } = useSlidingThumb(activeIndex);

// Signing in or out adds or removes two links. The ResizeObserver only knows
// about the elements that existed when it was created, so this is the one
// change it cannot see for itself.
watch(
  () => authStore.isAuthenticated,
  () => void nextTick(measure),
);

const initials = computed(() => {
  const name = authStore.user?.name;
  if (!name) return "";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
});

// ─── Hide on scroll, mobile only ────────────────────────────────────────
//
// Down hides, up shows, without having to return to the top. Desktop keeps
// the bar still: there the header costs 84 of some 900 vertical pixels, and a
// bar that moves on its own distracts more than the space it returns.
const HIDE_BELOW = 80; // stay put near the top, where the bar isn't in the way
const DEADBAND = 4; // ignore jitter and iOS rubber-banding

const hidden = ref(false);
let lastY = 0;
let desktopQuery: MediaQueryList | null = null;

function onScroll() {
  const y = window.scrollY;

  // Never hide while the avatar menu is open: the menu is anchored to the
  // header and would ride up out of view with it.
  if (desktopQuery?.matches || avatarMenuOpen.value || y < HIDE_BELOW) {
    hidden.value = false;
  } else if (y > lastY + DEADBAND) {
    hidden.value = true;
  } else if (y < lastY - DEADBAND) {
    hidden.value = false;
  }

  lastY = y;
}

onMounted(() => {
  desktopQuery = window.matchMedia("(min-width: 640px)");
  lastY = window.scrollY;
  window.addEventListener("scroll", onScroll, { passive: true });
});

onUnmounted(() => window.removeEventListener("scroll", onScroll));
</script>
