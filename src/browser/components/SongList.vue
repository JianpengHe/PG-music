<script setup lang="ts">
import type { ISong } from "../types";
import { PlayOne, Pause, CollectionRecords, Like, MusicOne } from "@icon-park/vue-next";
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { player } from "../player";
import { onMounted, ref } from "vue";
import { usePlaySongList } from "../hooks/usePlaySongList";
import { router } from "../router";
import type { VirtualScrollItem } from "../hooks/useVirtualScroll";

export type SongListProps = {
  list: VirtualScrollItem<ISong>[];
  renderVirtualScroll: () => void;
  parentHeight: number;
};
const props = defineProps<SongListProps>();
const { songInfo } = usePlaySongInfo();
const songList = usePlaySongList(
  data => new Map([...data.values()].filter(({ isTemp }) => isTemp !== true).map(item => [item.id, item])),
);

const setSong = async (item: ISong, e: PointerEvent) => {
  // @ts-ignore
  window.audioContext.state === "suspended" && window.audioContext.resume();

  if (item.id === songInfo.value.id) return router.openSongDetailPage(e);

  if (iconTemplate.value) {
    const node = (iconTemplate.value as any).$el.cloneNode(true) as HTMLElement;
    const { clientX, clientY } = e;
    node.style.display = "block";
    node.style.left = `${clientX}px`;
    node.style.top = `${clientY}px`;
    document.body.appendChild(node);
    node.addEventListener("animationend", () => node.remove());
  }
  const [song] = await Promise.all([
    player.getSrcAndLyric(item),
    // QQmusicSDK.songDetail(item.mid),
    // QQmusicSDK.mvURL(item.mv_mid),
    new Promise(resolve => setTimeout(resolve, 360)),
  ]);
  player.audio.play();
  myEvent.emit("setSong", song);
};

const iconTemplate = ref<HTMLElement>();
onMounted(() => props.renderVirtualScroll());
</script>
<template>
  <div class="song-list" :style="{ height: `${props.parentHeight}px` }">
    <div
      v-for="item in props.list"
      :key="item.key + '-' + (item.data?.id ?? 0)"
      class="song-item"
      @click="e => item.data && setSong(item.data, e)"
      :style="{ transform: `translateY(${item.top}px)` }"
      v-show="item.data"
      :data-index="item.data ? item.index : -1"
    >
      <template v-if="item.data">
        <img :src="item.data?.pic" alt="" />
        <div class="song-item-info">
          <h3>{{ item.data.name }}</h3>
          <h4>{{ item.data.singer }}</h4>
        </div>
        <div class="song-item-icons">
          <Like
            v-if="songList.has(item.data.id)"
            size="20"
            theme="filled"
            class="active"
            @click.stop="player.deleteSong(item.data.id)"
          />
          <CollectionRecords v-else size="20" @click.stop="player.addSong(item.data)" />
          <Pause
            v-if="item.data.id === songInfo.id && songInfo.isPlaying"
            size="20"
            @click.stop="player.playOrPause()"
          />
          <PlayOne v-else size="20" />
        </div>
      </template>
    </div>
    <MusicOne size="24" style="display: none" ref="iconTemplate" class="icon-template" />
  </div>
</template>
<style scoped>
.song-list {
  position: relative;
  background-color: var(--color-surface);
  /* display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px; */
  cursor: pointer;
  overflow: hidden;
}
.song-item {
  position: absolute;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
  height: 80px;
  overflow: hidden;
}
.song-item > img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
}
.song-item-info {
  flex: 1;
  min-width: 0;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.song-item-info > h4 {
  font-size: 14px;
  line-height: 16px;
  font-weight: 300;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  word-break: break-all;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2; /* 这里是超出几行省略 */
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
