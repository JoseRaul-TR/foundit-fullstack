<!-- apps/web/app/components/auth/AuthField.vue -->
<!-- One field, declared once. Login has two and register four, all with the
     same label, the same pill, the same error line — six copies of the same
     agreement is where they start to drift.

     16px on every screen size, not 14: below that, iOS zooms the viewport the
     moment the field takes focus, and a zoomed page scrolls sideways. It's the
     same fix the search field and the country select already carry, and a
     login form is the worst possible place to meet that bug. -->
<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-primary">
      {{ label }}
    </label>
    <input
      :id="id"
      :name="name ?? id"
      :type="type"
      :value="modelValue"
      :autocomplete="autocomplete"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : undefined"
      class="w-full rounded-full bg-surface-elevated px-4 py-2.5 text-base text-primary ring-1 transition placeholder:text-secondary focus:outline-none"
      :class="error ? 'ring-error' : 'ring-border'"
      @input="
        $emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
      @blur="$emit('blur')"
    />
    <slot />
    <span v-if="error" :id="`${id}-error`" class="text-xs text-error">
      {{ error }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  id: string;
  label: string;
  modelValue: string;
  type: "text" | "email" | "password";
  autocomplete?: string;
  name?: string;
  error?: string;
}>();

defineEmits<{ "update:modelValue": [value: string]; blur: [] }>();
</script>
