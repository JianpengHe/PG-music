<script setup lang="ts">
import { RecordDisc, Microphone } from "@icon-park/vue-next";
import { player } from "../player";
import { ref } from "vue";
export type SongDetailVolumeProps = {
  type: "music" | "mic";
};
const { type } = defineProps<SongDetailVolumeProps>();
const getValue = () => {
  switch (type) {
    case "music":
      return player.audioPlus.volume;
    case "mic":
      return player.audioPlus.micInfo?.gain.gain.value ?? 0;
  }
  return 0;
};
const setValue = (n: number) => {
  n = Math.floor(Math.min(1, Math.max(0, n)) * 100);
  progress.value = n;
  n /= 100;
  switch (type) {
    case "music":
      player.audioPlus.volume = n;
      return;
    case "mic":
      if (player.audioPlus.micInfo?.gain.gain) player.audioPlus.micInfo.gain.gain.value = n;
      return;
  }
};

const progress = ref(Math.floor(getValue() * 100));

function moveStart(e: PointerEvent) {
  const { bottom, height } = (e.currentTarget as HTMLElement).getBoundingClientRect();
  function move(e: PointerEvent) {
    setValue((bottom - e.clientY) / height);
  }

  function end() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);

  // 按下时立即计算一次
  move(e);
}
function wheel({ deltaY }: WheelEvent) {
  setValue((getValue() * 100 - deltaY / 10) / 100);
}
</script>

<template>
  <div class="song-detail-progress">
    <RecordDisc size="20" v-if="type === 'music'" />
    <Microphone size="20" v-if="type === 'mic'" />
    <div
      class="song-detail-progress-bar"
      @pointerdown="moveStart"
      @wheel="wheel"
      :style="{ '--progress': `${progress}%` }"
    >
      <div class="song-detail-progress-bar-line song-detail-progress-bar-none"></div>
      <div class="song-detail-progress-bar-line song-detail-progress-bar-fill"></div>
      <div class="song-detail-progress-bar-ball"></div>
    </div>
    <div>{{ progress }}</div>
  </div>
</template>

<style scoped>
.song-detail-progress {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  color: var(--color-border-hover);
  font-size: 14px;
  margin: 4px;
}
.song-detail-progress::before,
.song-detail-progress::after {
  content: " ";
  display: block;
  height: 0px;
}

/* 进度条 */
.song-detail-progress-bar {
  width: 24px;
}
.song-detail-progress-bar-line {
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: var(--size);
}
/* 未播放部分 */
.song-detail-progress-bar-none {
  height: 100%;
}

/* 已播放部分 */
.song-detail-progress-bar-fill {
  height: var(--progress);
}

/* 圆点 */
.song-detail-progress-bar-ball {
  left: 50%;
  bottom: var(--progress);
  transform: translate(-50%, 50%);
}
</style>
