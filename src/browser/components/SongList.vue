<script setup lang="ts">
import type { ISong } from "./types";
import { PlayOne, Pause, Entertainment, AddMusic } from "@icon-park/vue-next";
import { useAudioPlayState } from "../hooks/useAudioPlayState";
export type SongListProps = {
  curSong: ISong;
  list: ISong[];
};
export type SongListEmits = {
  (e: "play", value: ISong): void;
};
const emit = defineEmits<SongListEmits>();

const { isPlaying } = useAudioPlayState();
const play = (item: ISong) => {
  console.log(item);
  emit("play", item);
};

const { curSong, list } = defineProps<SongListProps>();
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
        <Entertainment size="24" />
        <AddMusic size="24" />
        <Pause v-if="item.id === curSong?.id && isPlaying" size="24" @click="play(item)" />
        <PlayOne v-else size="24" @click="play(item)" />
      </div>
    </div>
  </div>
</template>
<style scoped>
.song-list {
  position: relative;
  background-color: #fff;
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
}
.song-item-info > h4 {
  font-size: 14px;
  line-height: 16px;
  font-weight: 300;
  color: #888;
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
