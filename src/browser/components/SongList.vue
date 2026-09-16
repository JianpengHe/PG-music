<script setup lang="ts">
import type { ISong } from "../types";
import { PlayOne, Pause, Entertainment, AddMusic, MusicOne } from "@icon-park/vue-next";
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { formatLyricLine } from "../../api/common/lyricConvert";
import { QQmusicSDK } from "../QQmusicSDK";
import { player } from "../player";
import { ref } from "vue";

export type SongListProps = {
  list: ISong[];
  openSongDetailPage: (e: any) => void;
};
const { list, openSongDetailPage } = defineProps<SongListProps>();
const { songInfo } = usePlaySongInfo();
const setSong = async (item: ISong, e: MouseEvent) => {
  // @ts-ignore
  window.audioContext.state === "suspended" && window.audioContext.resume();

  if (item.id === songInfo.value.id) return openSongDetailPage(e);

  if (iconTemplate.value) {
    const node = (iconTemplate.value as any).$el.cloneNode(true) as HTMLElement;
    const { clientX, clientY } = e;
    node.style.display = "block";
    node.style.left = `${clientX}px`;
    node.style.top = `${clientY}px`;
    document.body.appendChild(node);
    node.addEventListener("animationend", () => node.remove());
  }
  const [src, lyric] = await Promise.all([
    QQmusicSDK.playURL(item.mid, `C400${item.media_mid}.m4a`),
    QQmusicSDK.lyric(item.id),
    // QQmusicSDK.songDetail(item.mid),
    // QQmusicSDK.mvURL(item.mv_mid),
    new Promise(resolve => setTimeout(resolve, 360)),
  ]);
  player.audio.play();
  myEvent.emit("setSong", { ...item, src, lyric: formatLyricLine(lyric, 5) });
};

const iconTemplate = ref<HTMLElement>();
</script>
<template>
  <div class="song-list">
    <div v-for="item in list" :key="item.id" class="song-item" @click="e => setSong(item, e)">
      <img :src="item.pic" alt="" />
      <div class="song-item-info">
        <h3>{{ item.name }}</h3>
        <h4>{{ item.singer }}</h4>
      </div>
      <div class="song-item-icons">
        <AddMusic size="20" />
        <Pause v-if="item.id === songInfo.id && songInfo.isPlaying" size="20" @click.stop="player.playOrPause()" />
        <PlayOne v-else size="20" />
      </div>
    </div>
    <MusicOne theme="outline" size="24" style="display: none" ref="iconTemplate" class="icon-template" />
  </div>
</template>
<style scoped>
.song-list {
  position: relative;
  background-color: var(--color-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
  cursor: pointer;
}
.song-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
}
.song-item > img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
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
  color: var(--color-text-primary);
}
.song-item-info > h4 {
  font-size: 14px;
  line-height: 16px;
  font-weight: 300;
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
.icon-template {
  position: fixed;
  top: 0;
  left: 0;
  animation: falling 0.7s cubic-bezier(0.5, 0, 1, 0.5) forwards;
  pointer-events: none;
}
@keyframes falling {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh);
    opacity: 0;
  }
}
</style>
