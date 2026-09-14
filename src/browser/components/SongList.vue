<script setup lang="ts">
import type { ISong } from "../types";
import { PlayOne, Pause, Entertainment, AddMusic } from "@icon-park/vue-next";
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { formatLyricLine } from "../../api/common/lyricConvert";
import { QQmusicSDK } from "../QQmusicSDK";
import { player } from "../player";

export type SongListProps = {
  list: ISong[];
};

const { songInfo } = usePlaySongInfo();
const setSong = async (item: ISong) => {
  const [src, lyric] = await Promise.all([
    QQmusicSDK.playURL(item.mid, `C400${item.media_mid}.m4a`),
    QQmusicSDK.lyric(item.id),
  ]);
  myEvent.emit("setSong", { ...item, src, lyric: formatLyricLine(lyric, 5) });
};

const { list } = defineProps<SongListProps>();
</script>
<template>
  <div class="song-list">
    <div v-for="item in list" :key="item.id" class="song-item">
      <img :src="item.pic" alt="" />
      <div class="song-item-info">
        <h3>{{ item.name }}</h3>
        <h4>{{ item.singer }}</h4>
      </div>
      <div class="song-item-icons">
        <Entertainment size="20" />
        <AddMusic size="20" />
        <Pause v-if="item.id === songInfo.id && songInfo.isPlaying" size="20" @click="player.playOrPause()" />
        <PlayOne v-else size="20" @click="setSong(item)" />
      </div>
    </div>
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
</style>
