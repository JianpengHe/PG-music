<script setup lang="ts">
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import SongDetailLyric from "./SongDetailLyric.vue";
import SongDetailControl from "./SongDetailControl.vue";

const { songInfo } = usePlaySongInfo();
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
