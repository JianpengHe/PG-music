<script setup lang="ts">
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { LyricShow } from "../../api/common/lyricConvert";
import { player } from "../player";
import { onMounted, onUnmounted, ref } from "vue";

const { songInfo } = usePlaySongInfo();
const lyricRef = ref<HTMLDivElement>();
const lyric = ref<LyricShow["lyricData"]>(player.lyricShow.lyricData);
function changeLyric() {
  lyric.value = player.lyricShow.lyricData;
  const parent = lyricRef.value;
  if (!parent || parent.children.length === 0 || lyric.value.lineIndex < 0) return;
  const { offsetTop, clientHeight } = parent.children[lyric.value.lineIndex] as any;
  if (performance.now() > cdTime)
    parent.scrollTo({
      top: offsetTop - parent.clientHeight / 2,
      behavior: "smooth",
    });
}

let cdTime = 0;
let timer = 0;
function setCDTime() {
  cdTime = performance.now() + 3000;
  if (timer) clearTimeout(timer);
  timer = Number(
    setTimeout(() => {
      timer = 0;
      myEvent.emit("changeLyric", undefined);
    }, 3100),
  );
}
function moveStart() {
  cdTime = Infinity;
  const end = () => {
    setCDTime();
    window.removeEventListener("touchend", end);
  };
  window.addEventListener("touchend", end);
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
  <div
    class="song-detail-lyric"
    :class="{ musicPlaying: songInfo.isPlaying }"
    ref="lyricRef"
    @wheel="setCDTime"
    @touchstart="moveStart"
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
</template>
<style scoped>
.song-detail-lyric::after,
.song-detail-lyric::before {
  content: " ";
  display: block;
  height: 40vh;
  height: 40dvh;
}
.song-detail-lyric {
  width: 100%;
  overflow: auto;
  flex: 1;
  min-height: 0;
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
.song-detail-lyric::-webkit-scrollbar {
  display: none;
}
.song-detail-lyric > div {
  transition: font-size 0.3s ease-in-out;
}
.lyric {
  height: unset;
  font-size: 20px;
}
.lyric span {
  background-color: var(--color-border);
}
</style>
