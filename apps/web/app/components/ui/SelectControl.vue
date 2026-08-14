<!-- apps/web/app/components/ui/SelectControl.vue -->
<!-- The app's one select. There were five, in four files, with five different
     appearances: two widths, two ways of drawing the outline, and three type
     sizes for the same control.

     `appearance-none` plus a drawn chevron, because the native arrow is the
     one part of a select that can't be styled and looks like the operating
     system rather than like this app. The chevron is `pointer-events-none` so
     clicking it still opens the select — the browser handles that as long as
     nothing intercepts the click.

     16px below `sm`: iOS zooms the viewport when a control under that size
     takes focus, and a select is a control like any other. -->
<template>
  <div class="relative inline-flex w-full sm:w-auto">
    <select
      class="h-9 w-full appearance-none rounded-full bg-surface-elevated pl-4 pr-9 text-base font-medium text-primary ring-1 ring-border transition hover:ring-primary/40 disabled:opacity-50 sm:text-sm"
      :value="modelValue"
      :disabled="disabled"
      @change="
        $emit('update:modelValue', ($event.target as HTMLSelectElement).value)
      "
    >
      <slot />
    </select>
    <svg
      class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string | null; disabled?: boolean }>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>
