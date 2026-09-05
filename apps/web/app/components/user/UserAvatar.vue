<!-- apps/web/app/components/user/UserAvatar.vue -->
<template>
  <span
    class="grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-bold text-page"
  >
    <img
      v-if="showImage"
      :src="src!"
      :alt="name ?? ''"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <span v-else-if="initials">{{ initials }}</span>
    <svg
      v-else
      class="h-1/2 w-1/2"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
      />
    </svg>
  </span>
</template>
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string | null;
    name?: string | null;
    email?: string | null;
  }>(),
  { src: null, name: null, email: null },
);

// An <img> that renders is not an <img> that loaded. This flag is the
// difference between the two: only @error can tell us, and it fires after
// the element is already in the DOM — which is why a plain v-if on the URL
// leaves a broken frame instead of falling back (#313).
const failed = ref(false);
watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);

const showImage = computed(() => Boolean(props.src) && !failed.value);

// The fallback chain is name → email → glyph. A user with neither used to
// get an empty coloured circle, which reads as a rendering bug rather than
// as an avatar.
const initials = computed(() => {
  const name = props.name?.trim();
  if (name) {
    const letters = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase();
    if (letters) return letters;
  }

  const local = props.email?.trim().split("@")[0];
  const letter = local?.match(/\p{L}|\p{N}/u)?.[0];
  return letter ? letter.toUpperCase() : null;
});
</script>
