<script setup lang="ts">
import SongDetail from "@/components/SongDetail.vue";
import { Back } from "@icon-park/vue-next";
import { onMounted, onUnmounted, ref } from "vue";
import { myEvent } from "../event";
import { Router, router } from "../router";
import SongDetailDownload from "./SongDetailDownload.vue";

const openSongDetailPageData = ref<Router["openSongDetailPagePos"]>(router.openSongDetailPagePos);
const sysBack = () => history.back();

function openSongDetailPage() {
  openSongDetailPageData.value = router.openSongDetailPagePos;
}
onMounted(() => myEvent.on("openSongDetailPage", openSongDetailPage));
onUnmounted(() => myEvent.off("openSongDetailPage", openSongDetailPage));
</script>
<template>
  <Transition name="song-detail-page">
    <div
      v-if="openSongDetailPageData"
      :style="{
        '--start-x': `${openSongDetailPageData.x}px`,
        '--start-y': `${openSongDetailPageData.y}px`,
      }"
      class="song-detail-page"
      @contextmenu.prevent
      @selectstart.prevent
      @dragstart.prevent
    >
      <div class="song-detail-page-header">
        <Back theme="outline" size="24" @click="sysBack" />
        <SongDetailDownload />
      </div>

      <SongDetail />
    </div>
  </Transition>
</template>
<style scoped>
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

.song-detail-page-header {
  position: absolute;
  top: 0px;
  left: 0px;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.i-icon {
  margin: 12px;
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
