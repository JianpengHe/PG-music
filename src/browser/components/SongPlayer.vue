<script setup lang="ts">
import { ref } from "vue";
import type { ISong } from "./types";
import { PlayOne, Pause } from "@icon-park/vue-next";
import { useAudioPlayState } from "../hooks/useAudioPlayState";
export type SongListProps = {
  curSong: ISong;
};
export type SongListEmits = {
  (e: "play", value: ISong): void;
};
const emit = defineEmits<SongListEmits>();

const { isPlaying } = useAudioPlayState();
const play = (item: ISong) => {
  console.log(item);
  emit("play", item);
};

const { curSong: item } = defineProps<SongListProps>();
</script>
<template>
  <div class="song-item" :class="{ musicPlaying: isPlaying }" :style="item.id ? 'transform: translate(-50%, 0)' : ''">
    <img :src="item.pic" alt="" />
    <div class="song-item-info">
      <h3>{{ item.name }} - {{ item.singer }}</h3>
      <h4 id="lyric"></h4>
    </div>
    <div class="song-item-icons">
      <Pause v-if="isPlaying" size="36" @click="play(item)" />
      <PlayOne v-else size="36" @click="play(item)" />
    </div>
  </div>
</template>
<style scoped>
.song-item {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transition: transform 0.3s ease-in-out;
  transform: translate(-50%, 120%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
  box-shadow: 0px 0px 12px 1px rgba(0, 0, 0, 0.3);
  width: calc(100vmin - 24px);
  backdrop-filter: blur(12px);
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
}
.song-item-info > h3 {
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
}
.song-item-info > h4 {
  font-size: 14px;
  line-height: 16px;
  font-weight: 300;
  color: #888;
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
:global(#lyric) {
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

:global(#lyric span) {
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-color: rgba(150, 150, 150, 1);
  background-image: linear-gradient(#01e5ff, #01e5ff);
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

:global(.musicPlaying #lyric span) {
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
@keyframes rotateImg {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
