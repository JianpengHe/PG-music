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
} from "@icon-park/vue-next";
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { QQmusicSDK } from "../QQmusicSDK";
import { player } from "../player";
import { onMounted, onUnmounted, ref } from "vue";
import SongDetailProgress from "./SongDetailProgress.vue";
// export type SongDetailProps = {
//   openSongDetailPage: (e?: any) => void;
// };

// const { openSongDetailPage } = defineProps<SongDetailProps>();
const { songInfo } = usePlaySongInfo();

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
onUnmounted(() => {
  if (isMV.value) myEvent.emit("setSong", songInfo.value as any);
});
</script>
<template>
  <div class="song-detail-control">
    <div class="song-detail-control-btns">
      <Entertainment size="20" title="开启麦克风" :class="{ active: isMicrophone }" @click="toggleMicrophone" />
      <Piano size="20" title="切换伴奏" :class="{ active: isInstrumental }" @click="toggleInstrumental" />
      <VideoTwo size="20" title="视频MV" :class="{ active: isMV }" @click="toggleMV" />
      <VolumeNotice size="20" title="调节音量" />
    </div>
    <SongDetailProgress />
    <div class="song-detail-control-btns song-detail-control-main-btn">
      <PlayCycle size="20" />
      <GoStart size="30" class="i-icon" />
      <Pause v-if="songInfo.isPlaying" size="48" @click.stop="player.playOrPause()" />
      <PlayOne v-else size="48" @click.stop="player.playOrPause()" />
      <GoEnd size="30" />
      <ListBottom size="20" />
    </div>
  </div>
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

/* .song-detail-control-main-btn {
  opacity: 1;
} */
</style>
<style>
.song-detail-control-btns svg[width="20"] {
  color: var(--color-border-hover);
}
.song-detail-control-btns .i-icon.active svg {
  color: var(--color-primary) !important;
}
</style>
