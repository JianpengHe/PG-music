<script setup lang="ts">
import { PlayOne, Pause } from "@icon-park/vue-next";
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { player } from "../player";
import { onMounted, onUnmounted, ref } from "vue";
import { myEvent } from "../event";
import { LyricShow } from "../../api/common/lyricConvert";
import { router } from "../router";

const { songInfo } = usePlaySongInfo();

const isOpenOpenSongDetailPage = ref<boolean>(Boolean(router.openSongDetailPagePos));
const lyric = ref<LyricShow["lyricData"]>(player.lyricShow.lyricData);

function openSongDetailPage() {
  isOpenOpenSongDetailPage.value = Boolean(router.openSongDetailPagePos);
}

function changeLyric() {
  if (isOpenOpenSongDetailPage.value) return;
  lyric.value = player.lyricShow.lyricData;
}

onMounted(() => {
  myEvent.on("openSongDetailPage", openSongDetailPage);
  myEvent.on("changeLyric", changeLyric);
});

onUnmounted(() => {
  myEvent.off("openSongDetailPage", openSongDetailPage);
  myEvent.off("changeLyric", changeLyric);
});
</script>
<template>
  <div
    class="song-item"
    :class="{ musicPlaying: songInfo.isPlaying }"
    :style="
      !!songInfo.id && !isOpenOpenSongDetailPage ? 'transform: translate(-50%, 0)' : 'transform: translate(-50%, 120%)'
    "
    @click="router.openSongDetailPage"
  >
    <img :src="songInfo.pic" alt="" />
    <div class="song-item-info">
      <h3>{{ songInfo.name }} - {{ songInfo.singer }}</h3>
      <h4 class="lyric">
        <span
          v-for="(ch, chIndex) in lyric.data"
          :style="{ animationDelay: `${ch.delay}ms`, animationDuration: `${ch.duration}ms` }"
          :key="ch.html + chIndex"
          :data-html="ch.delay + '.' + chIndex"
          >{{ ch.text }}</span
        >
      </h4>
    </div>
    <div class="song-item-icons">
      <Pause v-if="songInfo.isPlaying" size="36" @click.stop="player.playOrPause" />
      <PlayOne v-else size="36" @click.stop="player.playOrPause" />
    </div>
  </div>
</template>
<style scoped>
.song-item {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transition: transform 0.3s ease-in-out;
  border-radius: 24px;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
  box-shadow: 0px 0px 12px 1px var(--color-shadow);
  width: calc(100vmin - 24px);
  backdrop-filter: blur(12px);
  background-color: rgba(247, 248, 252, 0.66);
  z-index: 10000;
  cursor: pointer;
}
.song-item > img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  animation-iteration-count: infinite;
  animation-name: rotateImg;
  animation-duration: 20s;
  animation-timing-function: linear;
  animation-play-state: paused;
}
.musicPlaying.song-item > img {
  animation-play-state: running;
}
.song-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
  padding: 2px 0;
}
.song-item-info > h3 {
  font-size: 16px;
  line-height: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.song-item-info > h4 {
  font-size: 14px;
  line-height: 14px;
  font-weight: 450;
  color: var(--color-text-secondary);
}
h3,
h4 {
  margin: 0;
}
.song-item-icons {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

@keyframes rotateImg {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
