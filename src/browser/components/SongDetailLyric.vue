<script setup lang="ts">
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { LyricShow } from "../../api/common/lyricConvert";
import { player } from "../player";
import { onMounted, onUnmounted, ref } from "vue";
import { Play } from "@icon-park/vue-next";
import { formatTime } from "../util";
const OffsetTop = innerHeight * 0.4;

const { songInfo } = usePlaySongInfo();
const lyricRef = ref<HTMLDivElement>();
const lyric = ref<LyricShow["lyricData"]>(player.lyricShow.lyricData);
const quicklyPlayLineIndex = ref<number>(-1);

function changeLyric() {
  lyric.value = player.lyricShow.lyricData;
  const listDom = lyricRef.value;
  if (!listDom || isMoving || (songInfo.value.lyric?.length ?? 0) === 0 || lyric.value.lineIndex < 0) return;
  listDom.parentElement?.scrollTo({
    top: lyric.value.lineIndex * 28,
    behavior: "smooth",
  });
}

// let cdTime = 0;
let isMoving = false;
let timer = 0;
function setTimer(ms: number, fn: () => void) {
  if (timer) clearTimeout(timer);
  timer = Number(
    setTimeout(() => {
      timer = 0;
      fn();
    }, ms),
  );
}
function wheel() {
  updateQuicklyPlayLineIndex();
  isMoving = true;
  // cdTime = performance.now() + 3000;
  if (timer) clearTimeout(timer);
  setTimer(300, () => {
    const listDom = lyricRef.value;
    if (!listDom) return;
    // const lineIndex = updateQuicklyPlayLineIndex();
    // const childDom = listDom.children[lineIndex] as HTMLDivElement;
    // if (!childDom) return;
    // quicklyPlayTop.value = childDom.offsetTop;
    // listDom.parentElement?.scrollTo({
    //   top: lineIndex * 28,
    //   behavior: "smooth",
    // });

    setTimer(2500, () => {
      quicklyPlayLineIndex.value = -1;
      isMoving = false;
      myEvent.emit("changeLyric", undefined);
    });
  });
}
function updateQuicklyPlayLineIndex() {
  const listDom = lyricRef.value;
  const lineIndex =
    !listDom || !isMoving
      ? -1
      : Math.max(0, Math.min(listDom.children.length - 1, Math.round(listDom.parentElement!.scrollTop / 28)));
  quicklyPlayLineIndex.value = lineIndex;
  if (lineIndex >= 0) requestAnimationFrame(updateQuicklyPlayLineIndex);
  return lineIndex;
}
function moveStart() {
  isMoving = true;
  if (timer) clearTimeout(timer);
  updateQuicklyPlayLineIndex();
  // cdTime = Infinity;
  const end = () => {
    wheel();
    window.removeEventListener("touchmove", updateQuicklyPlayLineIndex);
    window.removeEventListener("touchend", end);
  };
  window.addEventListener("touchmove", updateQuicklyPlayLineIndex);
  window.addEventListener("touchend", end);
}

function getQuicklyPlayLineIndexTime() {
  return (songInfo.value.lyric?.[quicklyPlayLineIndex.value]?.[0]?.absoluteTime ?? 0) / 1000;
}
function jumpQuicklyPlayLineIndexTime() {
  player.audio.currentTime = getQuicklyPlayLineIndexTime();
  isMoving = false;
  quicklyPlayLineIndex.value = -1;
  if (timer) clearTimeout(timer);
}

onMounted(() => {
  myEvent.on("loadSong", changeLyric);
  myEvent.on("changeLyric", changeLyric);
  myEvent.emit("changeLyric", undefined);
});
onUnmounted(() => {
  myEvent.off("loadSong", changeLyric);
  myEvent.off("changeLyric", changeLyric);
  myEvent.emit("changeLyric", undefined);
});
</script>
<template>
  <div class="song-detail-lyric">
    <div class="song-detail-lyric-scroll" @wheel="wheel" @touchstart="moveStart">
      <div
        class="song-detail-lyric-content"
        :class="{ musicPlaying: songInfo.isPlaying }"
        :style="{ margin: `${OffsetTop}px 0` }"
        ref="lyricRef"
      >
        <div
          v-for="(line, lineIndex) in songInfo.lyric"
          :key="songInfo.id + lineIndex"
          :class="{ lyric: lyric.lineIndex === lineIndex }"
        >
          <span
            v-if="lyric.lineIndex === lineIndex"
            v-for="(ch, chIndex) in lyric.data"
            :style="{ animationDelay: `${ch.delay}ms`, animationDuration: `${ch.duration}ms` }"
            :key="ch.html + chIndex"
            :data-html="ch.delay + '.' + chIndex"
            >{{ ch.text }}</span
          >
          <span v-else v-for="ch in line">{{ ch.text }}</span>
        </div>
      </div>
    </div>
    <div
      v-show="quicklyPlayLineIndex >= 0"
      class="quickly-play-line"
      :style="{ top: `${OffsetTop}px` }"
      @click="jumpQuicklyPlayLineIndexTime"
    >
      <Play theme="outline" size="20" />
      <span>{{ formatTime(getQuicklyPlayLineIndexTime()) }}</span>
    </div>
  </div>
</template>
<style scoped>
.song-detail-lyric {
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
  line-height: 28px;
  mask-image: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.6) 8%,
    rgba(255, 255, 255, 1) 15%,
    rgba(255, 255, 255, 1) 85%,
    rgba(255, 255, 255, 0.6) 91%,
    rgba(255, 255, 255, 0) 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.6) 8%,
    rgba(255, 255, 255, 1) 15%,
    rgba(255, 255, 255, 1) 85%,
    rgba(255, 255, 255, 0.6) 91%,
    rgba(255, 255, 255, 0) 100%
  );
}

.song-detail-lyric-scroll {
  overflow: auto;
  height: 100%;
}
.song-detail-lyric-scroll::-webkit-scrollbar {
  display: none;
}

/* .song-detail-lyric-content::after,
.song-detail-lyric-content::before {
  content: " ";
  display: block;
  height: 40vh;
  height: 40dvh;
} */
/* .song-detail-lyric-content { */
/* margin: 40vh 0; */
/* margin: 40dvh 0; */
/* } */

.song-detail-lyric-content > div {
  transition: font-size 0.3s ease-in-out;
  height: 28px;
  font-size: 16px;
}
.song-detail-lyric-content .lyric {
  height: 28px;
  font-size: 20px;
}
.song-detail-lyric-content .lyric span {
  background-color: var(--color-border);
}
.quickly-play-line {
  position: absolute;
  /* top: 50%;
  transform: translateY(-50%); */
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  margin: 0 12px;
  color: var(--color-border-hover);
}
</style>
