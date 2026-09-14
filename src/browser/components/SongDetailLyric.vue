<script setup lang="ts">
import type { ISong } from "../types";
import { PlayOne, Pause, Entertainment, AddMusic } from "@icon-park/vue-next";
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { formatLyricLine, LyricShow } from "../../api/common/lyricConvert";
import { QQmusicSDK } from "../QQmusicSDK";
import { player } from "../player";
import { onMounted, onUnmounted, ref } from "vue";

const { songInfo } = usePlaySongInfo();
console.log(songInfo);
const lyricRef = ref<HTMLDivElement>();
// const curLineIndex = ref<number>(-1);

// let onLyricLineChange: any;
const lyric = ref<LyricShow["lyricData"]>(player.lyricShow.lyricData);
function changeLyric() {
  lyric.value = player.lyricShow.lyricData;
  const parent = lyricRef.value;
  if (!parent) return;
  const { offsetTop, clientHeight } = parent.children[lyric.value.lineIndex] as any;
  parent.scrollTo({
    top: offsetTop - parent.clientHeight / 2,
    behavior: "smooth",
  });
}
onMounted(() => {
  // onLyricLineChange = player.lyricShow.onLyricLineChange;
  // player.lyricShow.onLyricLineChange = (html, index) => {
  //   if (!lyricRef.value) return;
  //   hiddenLineIndex.value = index;

  //   const parent = lyricRef.value?.parentElement as HTMLDivElement;
  //   const { offsetTop, clientHeight } = parent.children[index + 1] as any;
  //   lyricRef.value.innerHTML = html;
  //   lyricRef.value.style.transform = `translateY(${offsetTop - parent.clientHeight / 2 + clientHeight}px)`;
  //   parent.scrollTo({
  //     top: offsetTop - parent.clientHeight / 2,
  //     behavior: "smooth",
  //   });
  //   // if (!dom) return;
  //   // dom.style.display = "none";
  //   // console.log(index, lyricRef.value?.children[index]);
  // };
  myEvent.on("changeLyric", changeLyric);
  myEvent.emit("changeLyric", undefined);
  //  if (!player.isPlaying) player.lyricShow.pause();
});
onUnmounted(() => {
  myEvent.off("changeLyric", changeLyric);
  myEvent.emit("changeLyric", undefined);
});
</script>
<template>
  <div class="song-detail-lyric" :class="{ musicPlaying: songInfo.isPlaying }" ref="lyricRef">
    <div v-for="(line, index) in songInfo.lyric" :key="index" :class="{ lyric: lyric.lineIndex === index }">
      <span
        v-if="lyric.lineIndex === index"
        v-for="ch in lyric.data"
        :style="{ animationDelay: `${ch.delay}ms`, animationDuration: `${ch.duration}ms` }"
        >{{ ch.text }}</span
      >
      <span v-else v-for="ch in line" :key="ch.text + index">{{ ch.text }}</span>
    </div>
  </div>
</template>
<style scoped>
.song-detail-lyric {
  padding: 40vh 0;
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
