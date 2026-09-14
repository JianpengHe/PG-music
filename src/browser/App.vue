<script setup lang="ts">
import Home from "./Home.vue";
</script>

<template>
  <div class="app">
    <Home />
  </div>
</template>
<style scoped>
:global(*) {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}
:global(:root) {
  /* Background */
  --color-bg: #f7f8fc;
  --color-bg-secondary: #eef2fa;
  --color-shadow: #5975c54d;

  /* Surface */
  --color-surface: #ffffff;
  --color-surface-hover: #f0f4fc;

  /* Primary */
  --color-primary: #5975c5;
  --color-primary-hover: #6c84d8;
  --color-primary-active: #465fa8;
  --color-primary-light: #8199e8;

  /* Accent */
  --color-accent: #c6a83d;
  --color-accent-light: #e2d18a;

  /* Text */
  --color-text-primary: #202744;
  --color-text-secondary: #59647f;
  --color-text-tertiary: #8b94aa;

  /* Border */
  --color-border: #dce2f0;
}
.app {
  background-color: var(--color-bg);
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

:global(span.i-icon) {
  color: var(--color-text-secondary);
  cursor: pointer;
}
</style>
