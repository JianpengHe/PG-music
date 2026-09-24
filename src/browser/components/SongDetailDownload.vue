<script setup lang="ts">
import { Download } from "@icon-park/vue-next";
import { onMounted, onUnmounted, ref } from "vue";
import { myEvent } from "../event";
import { downloader } from "../downloader";

// const downloadItem = ref<DownloadItem | undefined>(downloader.getDownloadItems());
const downloadProgress = ref<HTMLDivElement>();
let rafId = 0;

function animationFn() {
  rafId = 0;
  const downloadItem = downloader.getDownloadItems();
  downloadProgress.value?.style.setProperty("--progress", `${(downloadItem?.info?.progress || 0) * 100}%`);
  if (!downloadItem || downloadItem.isClosed) return;
  rafId = requestAnimationFrame(animationFn);
}

async function addDownload() {
  const downloadItem = downloader.getDownloadItems();
  if (downloadItem) {
    downloadItem.stop();
    return;
  }

  await downloader.add();
  animationFn();
}

function setSong() {
  // downloadItem.value = downloader.getDownloadItems();
  if (!rafId) animationFn();
}
onMounted(() => {
  myEvent.on("setSong", setSong);
  myEvent.on("loadSong", setSong);
  rafId = requestAnimationFrame(animationFn);
});
onUnmounted(() => {
  myEvent.off("setSong", setSong);
  myEvent.off("loadSong", setSong);
  if (rafId) cancelAnimationFrame(rafId);
});
</script>
<template>
  <div class="song-detail-download" @click="addDownload" title="下载">
    <Download theme="outline" size="24" />
    <div class="download-progress" ref="downloadProgress"></div>
  </div>
</template>
<style scoped>
.song-detail-download {
  position: relative;
  width: 48px;
  height: 48px;
  cursor: pointer;
}
.i-icon {
  margin: 12px;
}
.download-progress {
  position: absolute;
  border-radius: 50%;
  --progress: 0%;
  --size: 40px;
  --width: calc(var(--size)/2 - 2px);
  width: var(--size);
  height: var(--size);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  background: conic-gradient(var(--color-border) var(--progress), transparent 0);
  -webkit-mask: radial-gradient(farthest-side, transparent var(--width), var(--color-border) var(--width));
  mask: radial-gradient(farthest-side, transparent var(--width), var(--color-border) var(--width));
}
</style>
