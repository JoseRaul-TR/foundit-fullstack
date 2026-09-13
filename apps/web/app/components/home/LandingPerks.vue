<!-- apps/web/app/components/home/LandingPerks.vue -->
<!-- PerksSection, Figma 77:252 (desktop) and 124:270 → 121:491 (mobile).
     Four columns on desktop, 2x2 below, spanning the page like everything
     else — the old `mx-auto max-w-4xl px-4` made this section 896px inside a
     container that was already padding it, so the perks sat narrower than the
     text above them and doubly inset.

     Elevation, not a border. A tester read these cards as buttons, and he was
     reading the app's own vocabulary correctly: `border border-border` on
     rounded corners is exactly how DiscoverFilters draws an unselected filter
     pill. A shadow lifts the card without drawing a perimeter (#323).

     The icons are the frames' own vectors with the gold swapped for
     currentColor, written inline because that is what every other icon in this
     project is — there is no icon library, and the four hand-written ones in
     UserAvatar, profile, the drawer and DiscoverFilterButton set the
     convention. Paths are bound rather than injected: v-html stays out of this
     project while the CSP carries 'unsafe-inline' (#327). -->
<template>
  <section class="w-full sm:mt-4">
    <h2
      class="text-center text-[11px] font-bold uppercase tracking-[0.04em] text-secondary sm:text-[13px]"
    >
      {{ $t("home.perks.title") }}
    </h2>

    <div class="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 sm:mt-14 lg:grid-cols-4">
      <div
        v-for="perk in perks"
        :key="perk.key"
        class="flex flex-col gap-1.5 rounded-xl bg-surface px-3.5 py-4 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.4)] sm:rounded-[14px] sm:px-[18px] sm:py-5"
      >
        <svg
          class="h-6 w-6 shrink-0 text-brand sm:h-7 sm:w-7"
          viewBox="0 0 28 28"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path v-for="(d, i) in perk.paths" :key="i" :d="d" />
        </svg>
        <p class="text-[13px] font-bold text-primary sm:text-sm">
          {{ $t(`home.perks.items.${perk.key}.title`) }}
        </p>
        <p class="text-[11px] text-secondary sm:text-xs sm:leading-[1.45]">
          {{ $t(`home.perks.items.${perk.key}.description`) }}
        </p>
      </div>
    </div>

    <div class="mt-6 flex justify-center sm:mt-14">
      <BrandLink :to="localePath('/register')" class="px-6 py-2.5 text-sm">
        {{ $t("home.perks.cta") }}
      </BrandLink>
    </div>
  </section>
</template>

<script setup lang="ts">
// Exported from the frames at 28px. The gear's clip-path was a 28x28 rect —
// the viewBox itself — so it is dropped. Round caps and joins are set once on
// the <svg> rather than per path: the frames vary there, the difference is
// invisible at 24px, and every other icon in the app is uniform.
const perks = [
  {
    key: "discover",
    paths: [
      "M14 17.5C15.933 17.5 17.5 15.933 17.5 14C17.5 12.067 15.933 10.5 14 10.5C12.067 10.5 10.5 12.067 10.5 14C10.5 15.933 12.067 17.5 14 17.5Z",
      "M22.6332 17.5C22.4779 17.8519 22.4315 18.2422 22.5002 18.6207C22.5688 18.9992 22.7492 19.3484 23.0182 19.6234L23.0882 19.6934C23.305 19.9101 23.4769 20.1675 23.5943 20.4508C23.7116 20.734 23.772 21.0376 23.772 21.3442C23.772 21.6508 23.7116 21.9544 23.5943 22.2376C23.4769 22.5209 23.305 22.7782 23.0882 22.995C22.8714 23.2118 22.614 23.3838 22.3308 23.5011C22.0475 23.6184 21.7439 23.6788 21.4373 23.6788C21.1307 23.6788 20.8272 23.6184 20.5439 23.5011C20.2607 23.3838 20.0033 23.2118 19.7865 22.995L19.7165 22.925C19.4415 22.6561 19.0923 22.4756 18.7139 22.407C18.3354 22.3384 17.9451 22.3847 17.5932 22.54C17.2481 22.6879 16.9538 22.9335 16.7465 23.2465C16.5392 23.5595 16.428 23.9263 16.4265 24.3017V24.5C16.4265 25.1189 16.1807 25.7124 15.7431 26.1499C15.3055 26.5875 14.712 26.8334 14.0932 26.8334C13.4743 26.8334 12.8808 26.5875 12.4433 26.1499C12.0057 25.7124 11.7598 25.1189 11.7598 24.5V24.395C11.7508 24.0089 11.6258 23.6343 11.4011 23.3202C11.1764 23.006 10.8624 22.7667 10.4998 22.6334C10.148 22.4781 9.75761 22.4317 9.37915 22.5003C9.00069 22.569 8.65146 22.7494 8.3765 23.0184L8.3065 23.0884C7.86868 23.5262 7.27485 23.7722 6.65567 23.7722C6.03649 23.7722 5.44267 23.5262 5.00484 23.0884C4.56701 22.6505 4.32104 22.0567 4.32104 21.4375C4.32104 20.8183 4.56701 20.2245 5.00484 19.7867L5.07484 19.7167C5.3438 19.4417 5.52422 19.0925 5.59284 18.714C5.66146 18.3356 5.61514 17.9452 5.45984 17.5934C5.31195 17.2483 5.06639 16.954 4.75338 16.7467C4.44037 16.5394 4.07359 16.4282 3.69817 16.4267H3.49984C2.881 16.4267 2.28751 16.1809 1.84992 15.7433C1.41234 15.3057 1.1665 14.7122 1.1665 14.0934C1.1665 13.4745 1.41234 12.881 1.84992 12.4434C2.28751 12.0059 2.881 11.76 3.49984 11.76H3.60484C3.991 11.751 4.36551 11.626 4.67969 11.4013C4.99386 11.1766 5.23317 10.8625 5.3665 10.5C5.5218 10.1481 5.56813 9.75779 5.49951 9.37933C5.43089 9.00087 5.25046 8.65165 4.9815 8.37669L4.9115 8.30669C4.69471 8.0899 4.52275 7.83253 4.40542 7.54928C4.28809 7.26603 4.22771 6.96244 4.22771 6.65585C4.22771 6.34927 4.28809 6.04568 4.40542 5.76243C4.52275 5.47918 4.69471 5.22181 4.9115 5.00502C5.12829 4.78823 5.38566 4.61626 5.66891 4.49894C5.95216 4.38161 6.25575 4.32122 6.56234 4.32122C6.86893 4.32122 7.17251 4.38161 7.45576 4.49894C7.73901 4.61626 7.99638 4.78823 8.21317 5.00502L8.28317 5.07502C8.55813 5.34398 8.90736 5.5244 9.28582 5.59303C9.66428 5.66165 10.0546 5.61532 10.4065 5.46002H10.4998C10.8449 5.31213 11.1392 5.06657 11.3465 4.75356C11.5538 4.44056 11.665 4.07377 11.6665 3.69835V3.50002C11.6665 2.88118 11.9123 2.28769 12.3499 1.8501C12.7875 1.41252 13.381 1.16669 13.9998 1.16669C14.6187 1.16669 15.2122 1.41252 15.6498 1.8501C16.0873 2.28769 16.3332 2.88118 16.3332 3.50002V3.60502C16.3347 3.98044 16.4459 4.34722 16.6532 4.66023C16.8605 4.97324 17.1548 5.2188 17.4998 5.36669C17.8517 5.52199 18.2421 5.56831 18.6205 5.49969C18.999 5.43107 19.3482 5.25065 19.6232 4.98169L19.6932 4.91169C20.131 4.47386 20.7248 4.22789 21.344 4.22789C21.6506 4.22789 21.9542 4.28828 22.2374 4.4056C22.5207 4.52293 22.778 4.6949 22.9948 4.91169C23.2116 5.12848 23.3836 5.38585 23.5009 5.6691C23.6182 5.95235 23.6786 6.25593 23.6786 6.56252C23.6786 6.86911 23.6182 7.17269 23.5009 7.45594C23.3836 7.7392 23.2116 7.99656 22.9948 8.21335L22.9248 8.28335C22.6559 8.55831 22.4755 8.90754 22.4068 9.286C22.3382 9.66446 22.3845 10.0548 22.5398 10.4067V10.5C22.6877 10.8451 22.9333 11.1394 23.2463 11.3467C23.5593 11.5539 23.9261 11.6652 24.3015 11.6667H24.4998C25.1187 11.6667 25.7122 11.9125 26.1498 12.3501C26.5873 12.7877 26.8332 13.3812 26.8332 14C26.8332 14.6189 26.5873 15.2124 26.1498 15.6499C25.7122 16.0875 25.1187 16.3334 24.4998 16.3334H24.3948C24.0194 16.3349 23.6526 16.4461 23.3396 16.6534C23.0266 16.8607 22.7811 17.155 22.6332 17.5Z",
    ],
  },
  {
    key: "watchlist",
    paths: [
      "M7.00016 3.5H21.0002C21.3096 3.5 21.6063 3.62292 21.8251 3.84171C22.0439 4.0605 22.1668 4.35725 22.1668 4.66667V24.5L14.0002 19.8333L5.8335 24.5V4.66667C5.8335 4.35725 5.95641 4.0605 6.17521 3.84171C6.394 3.62292 6.69074 3.5 7.00016 3.5Z",
    ],
  },
  {
    key: "history",
    paths: [
      "M14 24.5C19.799 24.5 24.5 19.799 24.5 14C24.5 8.20101 19.799 3.5 14 3.5C8.20101 3.5 3.5 8.20101 3.5 14C3.5 19.799 8.20101 24.5 14 24.5Z",
      "M14 8.16669V14L18.0833 16.3334",
    ],
  },
  {
    key: "filterPlatform",
    paths: ["M4.6665 5.83331H23.3332M4.6665 14H16.3332M4.6665 22.1666H11.6665"],
  },
] as const;

const localePath = useLocalePath();
</script>
