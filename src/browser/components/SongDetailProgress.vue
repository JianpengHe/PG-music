<script setup lang="ts">
import { player } from "../player";
import { onMounted, onUnmounted, ref } from "vue";

const duration = ref(0);
const currentTime = ref(0);
const isDragging = ref(false);

function update() {
  const audio = player.audio;
  duration.value = Number.isFinite(audio.duration) ? Math.floor(audio.duration) : 0;
  if (!isDragging.value) currentTime.value = Math.floor(audio.currentTime);
}

function formatTime(time: number) {
  if (!Number.isFinite(time) || time < 0) {
    return "00:00";
  }

  return `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
}

const progress = () => {
  if (!duration.value) return 0;
  return Math.min(100, Math.max(0, currentTime.value / duration.value) * 100);
};

function moveStart(e: PointerEvent) {
  if (!duration.value) return;
  isDragging.value = true;

  const { left, width } = (e.currentTarget as HTMLElement).getBoundingClientRect();
  // const { width } = bar.parentElement!.getBoundingClientRect();
  // const x = e.clientX - width * (currentTime.value / duration.value);

  function move(e: PointerEvent) {
    const percent = Math.min(1, Math.max(0, (e.clientX - left) / width));
    // const percent = Math.min(1, Math.max(0, (e.clientX - x) / width));
    currentTime.value = Math.floor(percent * duration.value);
  }

  function end() {
    isDragging.value = false;
    player.audio.currentTime = currentTime.value;
    update();
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);

  // 按下时立即计算一次
  move(e);
}

onMounted(() => {
  player.audio.addEventListener("loadedmetadata", update);
  player.audio.addEventListener("timeupdate", update);
  update();
});

onUnmounted(() => {
  player.audio.removeEventListener("loadedmetadata", update);
  player.audio.removeEventListener("timeupdate", update);
});
</script>

<template>
  <div class="song-detail-progress">
    <div class="song-detail-progress-time">
      {{ formatTime(currentTime) }}
    </div>
    <div class="song-detail-progress-bar" @pointerdown="moveStart" :style="{ '--progress': `${progress()}%` }">
      <div class="song-detail-progress-bar-line song-detail-progress-bar-none"></div>
      <div class="song-detail-progress-bar-line song-detail-progress-bar-fill"></div>
      <div class="song-detail-progress-bar-ball"></div>
    </div>
    <div class="song-detail-progress-time">
      {{ formatTime(duration) }}
    </div>
  </div>
</template>

<style scoped>
.song-detail-progress {
  display: flex;
  align-items: center;
  gap: 12px;

  width: 100%;
  max-width: 80vmin;
  max-width: 80dvw;
}

.song-detail-progress-time {
  flex: none;

  font-size: 12px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* 进度条 */

.song-detail-progress-bar {
  height: 24px;
}
.song-detail-progress-bar-line {
  top: 50%;
  transform: translateY(-50%);
  height: var(--size);
}
/* 未播放部分 */
.song-detail-progress-bar-none {
  width: 100%;
}

/* 已播放部分 */
.song-detail-progress-bar-fill {
  width: var(--progress);
}

/* 圆点 */
.song-detail-progress-bar-ball {
  top: 50%;
  left: var(--progress);
  transform: translate(-50%, -50%);
}
</style>
