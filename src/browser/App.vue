<script setup lang="ts">
import "./style.css";

import SearchSong from "@/components/SearchSong.vue";
import SongList from "@/components/SongList.vue";
import SongPlayer from "@/components/SongPlayer.vue";
import SongDetailPage from "@/components/SongDetailPage.vue";
import type { ISong } from "./types";
import { ref, watch } from "vue";
import { QQmusicSDK } from "./QQmusicSDK";
import { debouncedFn } from "./player";

const kw = ref("");
const smartTips = ref<string[]>([]);
const songList = ref<ISong[]>([]);
/** 是否可以发起下次搜索请求 */
let canReqSearch = true;
const submit = async (pageNum = 1) => {
  smartTips.value = [];
  canReqSearch = false;
  // console.log("发起搜索", value, pageNum);
  curPageNum = pageNum;
  const res = (await QQmusicSDK.search(kw.value, pageNum, 20)).list.map(
    ({ id, mid, name, singer, album, file, mv }) => ({
      start: 0,
      id,
      mid,
      name,
      singer: singer.map(item => item.name).join("、"),
      pic: QQmusicSDK.getMusicImgUrl(album.pmid),
      media_mid: file.media_mid,
      mv_mid: mv?.vid,
    }),
  );
  const map = new Map(pageNum === 1 ? [] : songList.value.map(item => [item.id, item]));
  for (const item of res) map.set(item.id, item);
  songList.value = [...map.values()];
  // console.log(songList.value, JSON.stringify(songList.value));
  setTimeout(tryLoadMore, 100);
  if (res.length) canReqSearch = true;
};

const debounce = debouncedFn(async () => {
  if (!kw.value) {
    songList.value = [];
    return;
  }
  smartTips.value = (await QQmusicSDK.smartbox(kw.value)) || [];
}, 500);
watch(kw, debounce);

let curPageNum = 1;

const songDetailPage = ref({ x: 0, y: 0 });
const openSongDetailPage = (e?: any) => {
  if (e) {
    songDetailPage.value = {
      x: e.clientX - innerWidth / 2,
      y: e.clientY - innerHeight / 2,
    };
    return;
  }
  songDetailPage.value = { x: 0, y: 0 };
};

const appRef = ref<HTMLDivElement>();
function tryLoadMore() {
  if (!appRef.value || !canReqSearch || !kw) return;
  const { scrollTop, scrollHeight, clientHeight } = appRef.value;
  if (scrollHeight - scrollTop - clientHeight > clientHeight * 0.5) return;
  submit(curPageNum + 1);
}
</script>

<template>
  <div class="app" @scroll="tryLoadMore" ref="appRef">
    <div class="container">
      <h1>鹏飞音乐</h1>
      <SearchSong placeholder="搜索" :smartTips="smartTips" @submit="submit" v-model="kw" />
      <SongList :kw="kw" :list="songList" :openSongDetailPage="openSongDetailPage" />
    </div>
  </div>
  <SongPlayer :x="songDetailPage.x" :y="songDetailPage.y" :openSongDetailPage="openSongDetailPage" />
  <SongDetailPage :x="songDetailPage.x" :y="songDetailPage.y" :openSongDetailPage="openSongDetailPage" />
</template>
<style scoped>
.app {
  background-color: var(--color-bg);
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: auto;
  width: 100%;
}
.app::-webkit-scrollbar {
  display: none;
}

.app:has(.song-detail-page) {
  overflow: hidden;
}
.container {
  margin-top: 24px;
  width: 100vmin;
  width: 100dvmin;
  position: absolute;
}
.container > h1 {
  font-size: 20px;
  margin: 12px 24px;
  padding: 0;
}
</style>
