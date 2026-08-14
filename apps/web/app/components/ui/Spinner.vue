<!-- apps/web/app/components/ui/Spinner.vue -->
<!-- Honest about the wait: the button's label already says what's happening,
     this says it's still happening. Stops spinning for anyone who has asked
     the system for reduced motion. -->
<template>
  <svg
    class="h-4 w-4 animate-spin motion-reduce:animate-none"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      class="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      stroke-width="4"
    />
    <path
      class="opacity-90"
      fill="currentColor"
      d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z"
    />
  </svg>
</template>
