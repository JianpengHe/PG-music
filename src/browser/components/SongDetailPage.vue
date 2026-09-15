<script setup lang="ts">
import SongDetail from "@/components/SongDetail.vue";
import { Back } from "@icon-park/vue-next";

export type SongDetailPageProps = {
  x: number;
  y: number;
  openSongDetailPage: (e?: any) => void;
};

const { x, y, openSongDetailPage } = defineProps<SongDetailPageProps>();

const sysBack = () => navigation.back();
</script>
<template>
  <Transition name="song-detail-page">
    <div
      v-if="x && y"
      :style="{
        '--start-x': `${x}px`,
        '--start-y': `${y}px`,
      }"
      class="song-detail-page"
    >
      <Back theme="outline" size="24" class="back-icon" @click="sysBack" />

      <SongDetail :openSongDetailPage="openSongDetailPage" />
    </div>
  </Transition>
</template>
<style>
.song-detail-page .i-icon {
  color: var(--color-border);
  cursor: pointer;
  filter: drop-shadow(0 0px 8px rgba(0, 0, 0, 0.5));
}
/* .song-detail-page path {
  filter: drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.2));
} */
/* .song-detail-page .i-icon::after {
  content: " ";
  position: relative;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-border-hover);
  display: block;
} */
/* .song-detail-page .i-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
} */
/* .song-detail-page .i-icon {
  position: relative;
  display: inline-block;
}

.song-detail-page .i-icon svg {
  display: block;
}

.song-detail-page .i-icon::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--color-border-hover);
} */
</style>
<style scoped>
.back-icon {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 9999;
}
.song-detail-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  width: 100dvw;
  height: 100vh;
  height: 100dvh;
  z-index: 9999;
  overflow: hidden;
}

/* 进入 */
.song-detail-page-enter-active {
  animation: songDetailPageEnter 0.3s ease-in-out;
}

/* 退出 */
.song-detail-page-leave-active {
  animation: songDetailPageLeave 0.3s ease-in-out;
}

@keyframes songDetailPageEnter {
  from {
    opacity: 0;
    transform: translate3d(var(--start-x), var(--start-y), 0) scale(0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes songDetailPageLeave {
  from {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }

  to {
    opacity: 0;
    transform: translate3d(var(--start-x), var(--start-y), 0) scale(0);
  }
}
</style>
