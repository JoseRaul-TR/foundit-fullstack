<!-- apps/web/app/components/auth/PasswordStrengthBar.vue -->
<!-- Three segments rather than a single filling bar: a bar that grows says
     "you're 60% done", which invites people to stop; three lit segments say
     which of three states you're in, which is what the label already says in
     words. The words stay — the bar alone is a colour, and a colour alone
     tells a colour-blind reader nothing. -->
<template>
  <div class="flex items-center gap-1" aria-hidden="true">
    <span
      v-for="segment in 3"
      :key="segment"
      class="h-1 flex-1 rounded-full transition-colors"
      :class="segment <= litSegments ? litClass : 'bg-border'"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ strength: "weak" | "medium" | "strong" }>();

const litSegments = computed(
  () => ({ weak: 1, medium: 2, strong: 3 })[props.strength],
);

const litClass = computed(
  () =>
    ({ weak: "bg-error", medium: "bg-brand", strong: "bg-success" })[
      props.strength
    ],
);
</script>
