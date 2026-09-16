<script setup lang="ts">
import type { ISong } from "../types";
import { PlayOne, Pause, Entertainment, AddMusic } from "@icon-park/vue-next";
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { formatLyricLine } from "../../api/common/lyricConvert";
import { QQmusicSDK } from "../QQmusicSDK";
import { player } from "../player";
import SongDetailLyric from "./SongDetailLyric.vue";
import SongDetailControl from "./SongDetailControl.vue";
import { onMounted, onUnmounted } from "vue";
export type SongDetailProps = {
  openSongDetailPage: (e?: any) => void;
};

const { openSongDetailPage } = defineProps<SongDetailProps>();
const { songInfo } = usePlaySongInfo();
const back = () => {
  const url = new URL(window.location.href);
  url.hash = "";
  history.replaceState({}, "", String(url));
  openSongDetailPage();
};
onMounted(() => {
  const url = new URL(window.location.href);
  url.hash = "#" + (player.currentSong?.mid || "");
  history.pushState({}, "", String(url));
  window.addEventListener("hashchange", back);
});
onUnmounted(() => {
  window.removeEventListener("hashchange", back);
});
</script>
<template>
  <div class="song-detail">
    <div class="song-detail-mask"></div>
    <img class="song-detail-pic-bg" :src="songInfo.pic" alt="" />
    <div class="song-detail-content">
      <div class="song-detail-name">{{ songInfo.name }}</div>
      <div class="song-detail-singer">{{ songInfo.singer }}</div>
      <SongDetailLyric />
      <SongDetailControl />
    </div>
  </div>
</template>
<style scoped>
.song-detail {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-border);
}
.song-detail-pic-bg {
  position: absolute;
  width: 100vmax;
  height: 100vmax;
  margin: -50vmax;
  left: 50%;
  top: 50%;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  -webkit-filter: blur(2vmax);
  filter: blur(2vmax);
  z-index: -2;
  transform: scale(1.1);
}
.song-detail-mask {
  position: absolute;
  width: 100vmax;
  height: 100vmax;
  margin: -50vmax;
  left: 50%;
  top: 50%;
  background-color: #000;
  opacity: 0.4;
  z-index: -1;
}
.song-detail-content {
  width: 100%;
  height: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
<style>
/* 进度条 */
.song-detail-progress-bar {
  --progress: 0%;
  --size: 2px;
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  cursor: pointer;
  touch-action: none;
}
.song-detail-progress-bar-line {
  position: absolute;
  display: block;
  /* inset: 0 auto 0 0; */
  border-radius: var(--size);
  pointer-events: none;
}
/* 未播放部分 */
.song-detail-progress-bar-none {
  background: var(--color-border-hover);
}

/* 已播放部分 */
.song-detail-progress-bar-fill {
  background: var(--color-border);
}

/* 圆点 */
.song-detail-progress-bar-ball {
  position: absolute;

  width: 12px;
  height: 12px;

  border-radius: 50%;
  background: var(--color-border);

  cursor: grab;
}
.song-detail-progress-bar-ball:hover {
  width: 16px;
  height: 16px;
}
</style>
