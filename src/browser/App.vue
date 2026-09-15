<script setup lang="ts">
import Home from "./Home.vue";
</script>

<template>
  <div class="app">
    <Home />
  </div>
</template>
<style>
* {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
}
:root {
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
  --color-border-hover: #b3c4e0b0;
}

span.i-icon {
  color: var(--color-text-secondary);
  cursor: pointer;
}

.lyric {
  /* position: fixed;
  width: 100%; */
  height: 16px;
  /* bottom: 4vmin; */
  /* z-index: 999999; */
  pointer-events: none;
  text-align: center;
  /* font-size: 18px; */
  /* line-height: 50px; */
  /* opacity: 0;
    transition: opacity 0.5s; */
  /* left: 0; */
  white-space: nowrap;
}

.lyric span {
  background-clip: text;
  -webkit-text-fill-color: transparent;
  background-color: var(--color-text-tertiary);
  background-image: linear-gradient(var(--color-primary), var(--color-primary));
  background-repeat: no-repeat;
  background-size: 0%;
  animation-fill-mode: forwards;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-delay: 0s;
  animation-direction: normal;
  animation-name: lyric;
  animation-play-state: paused;
}

.musicPlaying .lyric span {
  animation-play-state: running;
}

@keyframes lyric {
  0% {
    background-size: 0%;
  }

  100% {
    background-size: 100%;
  }
}
</style>
<style scoped>
.app {
  background-color: var(--color-bg);
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: auto;
  width: 100%;
}
.app::-webkit-scrollbar {
  display: none;
}

.app:has(.song-detail-page) {
  overflow: hidden;
}
</style>
