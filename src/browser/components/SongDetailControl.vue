<script setup lang="ts">
import {
  PlayOne,
  Pause,
  GoStart,
  GoEnd,
  ListBottom,
  PlayCycle,
  Entertainment,
  Piano,
  VideoTwo,
  VolumeNotice,
  PlayOnce,
} from "@icon-park/vue-next";
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { QQmusicSDK } from "../QQmusicSDK";
import { player } from "../player";
import { onMounted, onUnmounted, ref } from "vue";
import SongDetailProgress from "./SongDetailProgress.vue";
import SongDetailVolume from "./SongDetailVolume.vue";
const { songInfo } = usePlaySongInfo();
const playType = ref(player.playType);
function togglePlayType() {
  playType.value = player.playType = playType.value === "normal" ? "loop" : "normal";
}

const isMicrophone = ref(player.audioPlus.mic);
async function toggleMicrophone() {
  await player.audioPlus.setMic(!isMicrophone.value);
  isMicrophone.value = player.audioPlus.mic;
}

const isInstrumental = ref(player.audioPlus.instrumental);
function toggleInstrumental() {
  isInstrumental.value = !isInstrumental.value;
  player.audioPlus.instrumental = isInstrumental.value;
}

const isMV = ref(false);
async function toggleMV() {
  if (!songInfo.value) return;
  if (isMV.value) {
    isMV.value = false;
    myEvent.emit("setSong", songInfo.value as any);
    return;
  }
  const url = await QQmusicSDK.mvURL(songInfo.value.mv_mid);
  if (!url) return;
  player.openVideo(url);
  isMV.value = true;
}

const isVolume = ref(false);

function setVolume(value: boolean) {
  // console.log("setVolume", value);
  // if (!value) return;
  isVolume.value = value;
}
// function closeVolume(e: Event) {
//   let target = e.target as Element | null;
//   while (target && target.classList.toggle("song-detail-volume-dialog-content")) {
//     if (target === document.body) return setVolume(false);
//     target = target.parentElement;
//   }
// }
onUnmounted(() => {
  // window.removeEventListener("cilck", closeVolume);
  if (isMV.value) myEvent.emit("setSong", songInfo.value as any);
});
</script>
<template>
  <div class="song-detail-control">
    <div class="song-detail-control-btns">
      <Entertainment size="20" title="开启麦克风" :class="{ active: isMicrophone }" @click="toggleMicrophone" />
      <Piano size="20" title="切换伴奏" :class="{ active: isInstrumental }" @click="toggleInstrumental" />
      <VideoTwo size="20" title="视频MV" :class="{ active: isMV }" @click="toggleMV" />
      <div
        class="song-detail-volume"
        @click="setVolume(true)"
        @mouseenter="setVolume(true)"
        @mouseleave="setVolume(false)"
      >
        <VolumeNotice size="20" title="调节音量" :class="{ active: isVolume }" />
        <div class="song-detail-volume-dialog" v-if="isVolume">
          <div class="song-detail-volume-dialog-content">
            <SongDetailVolume type="music" />
            <SongDetailVolume type="mic" v-if="isMicrophone" />
          </div>
        </div>
      </div>
    </div>
    <SongDetailProgress />
    <div class="song-detail-control-btns song-detail-control-main-btn">
      <PlayCycle v-if="playType === 'normal'" size="20" @click="togglePlayType" />
      <PlayOnce v-if="playType === 'loop'" size="20" @click="togglePlayType" />
      <GoStart size="30" @click="player.prevSong()" />
      <Pause v-if="songInfo.isPlaying" size="48" @click.stop="player.playOrPause()" />
      <PlayOne v-else size="48" @click.stop="player.playOrPause()" />
      <GoEnd size="30" @click="player.nextSong()" />
      <ListBottom size="20" />
    </div>
  </div>
  <div v-if="isVolume" class="song-detail-volume-dialog-mask" @pointerdown="setVolume(false)"></div>
</template>
<style scoped>
.song-detail-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 80vmin;
  max-width: 80dvmin;
  width: 80%;
  padding: 24px 0;
  gap: 24px;
}
.song-detail-control-btns {
  display: flex;
  align-items: center;
  justify-content: space-around;
  max-width: 400px;
  width: 100%;
}
.song-detail-volume {
  position: relative;
  z-index: 100000;
}
.song-detail-volume-dialog {
  position: absolute;
  height: 200px;
  top: 0;
  left: 50%;
  transform: translate(-50%, -100%);
  padding: 8px;
}
.song-detail-volume-dialog-content {
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  width: 100%;
  height: 100%;
  display: flex;
}
.song-detail-volume-dialog-mask {
  position: fixed;
  width: 100vw;
  width: 100dvw;
  height: 100vh;
  height: 100dvh;
  top: 0;
  left: 0;
  z-index: 99999;
}
</style>
