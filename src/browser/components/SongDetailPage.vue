<script setup lang="ts">
import SongDetail from "@/components/SongDetail.vue";
import { Back } from "@icon-park/vue-next";

export type SongDetailPageProps = {
  x: number;
  y: number;
  setSongDetailPage: (e?: any) => void;
};

const { x, y, setSongDetailPage } = defineProps<SongDetailPageProps>();
</script>
<template>
  <div
    v-if="x && y"
    :style="{
      transform: `translate3d(${x}px, ${y}px, 0) scale(0)`,
    }"
    class="song-detail-page"
  >
    <Back theme="outline" size="24" class="back-icon" @click="setSongDetailPage()" />
    <SongDetail />
  </div>
</template>
<style scoped>
.back-icon.i-icon {
  color: var(--color-bg-secondary);
  cursor: pointer;
}
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
  height: 100vh;
  animation: songDetailPage 0.3s ease-in-out forwards;
  opacity: 0;
  z-index: 9999;
  overflow: hidden;
}
@keyframes songDetailPage {
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
</style>
