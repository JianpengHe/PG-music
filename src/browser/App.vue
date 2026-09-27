<script setup lang="ts">
import "./style.css";

import SearchSong from "@/components/SearchSong.vue";
import SongList from "@/components/SongList.vue";
import SongPlayer from "@/components/SongPlayer.vue";
import SongDetailPage from "@/components/SongDetailPage.vue";
import type { ISong, ISongListItem } from "./types";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { QQmusicSDK } from "./QQmusicSDK";
import { debouncedFn } from "./util";
import { player } from "./player";
import { useVirtualScroll } from "./hooks/useVirtualScroll";
import { myEvent } from "./event";
import { router } from "./router";

const numPerPage = Math.min(Math.max(Math.round(((innerHeight / 80) * 2) / 10) * 10, 10), 40);
const kw = ref("");
const smartTips = ref<string[]>([]);
const songList = ref<ISong[]>([]);
/** 是否可以发起下次搜索请求 */
let canReqSearch = true;
const submit = async (pageNum = 1) => {
  smartTips.value = [];
  if (!kw.value) {
    let list = [...player.songListMap.values()].filter(item => item.isTemp !== true);
    // list = Array(100)
    //   .fill(list)
    //   .map((data, index) => data.map((item: any) => ({ ...item, id: item.id + index * 1e10, name: item.name + index })))
    //   .flat()
    //   .map((item, index) => ({ ...item, singer: index }));
    songList.value = list;
    render();
    return;
  }
  canReqSearch = false;
  // console.log("发起搜索", value, pageNum);
  curPageNum = pageNum;
  const res = (await QQmusicSDK.search(kw.value, pageNum, numPerPage)).list.map(songDetailToSongListItem);
  const map = new Map(pageNum === 1 ? [] : songList.value.map(item => [item.id, item]));
  for (const item of res) map.set(item.id, item);
  songList.value = [...map.values()];
  render();
  // console.log(songList.value, JSON.stringify(songList.value));
  setTimeout(tryLoadMore, 100);
  if (res.length) canReqSearch = true;
};
const songDetailToSongListItem = ({ id, mid, name, singer, album, file, mv, vi }: any): ISong => ({
  start: 0,
  id,
  mid,
  name,
  singer: singer.map(({ name }: any) => name).join("、"),
  pic: QQmusicSDK.getMusicImgUrl(album.pmid),
  media_mid: file.media_mid,
  mv_mid: mv?.vid,
  album_name: album.name || name,
  /** 高潮时间点 */
  quicklyPos: [vi?.[4]].filter(Boolean),
});

const appRef = ref<HTMLDivElement>();
const { render, filterList } = useVirtualScroll(songList, appRef, 80);
const debounce = debouncedFn(async () => {
  if (!kw.value) return submit();
  smartTips.value = (await QQmusicSDK.smartbox(kw.value)) || [];
}, 500);
watch(kw, debounce);

let curPageNum = 1;

function tryLoadMore() {
  render();
  if (!appRef.value || !canReqSearch || !kw) return;
  const { scrollTop, scrollHeight, clientHeight } = appRef.value;
  if (scrollHeight - scrollTop - clientHeight > clientHeight * 0.5) return;
  submit(curPageNum + 1);
}
function toSearch({ detail }: CustomEvent<string>) {
  kw.value = detail;
  submit();
  if (location.hash) history.back();
}

async function setSongFromUrlHash(mid: string) {
  router.updateHash();
  let song: ISongListItem | undefined = [...player.songListMap.values()].find(item => item.mid === mid);
  if (!song) song = songDetailToSongListItem((await QQmusicSDK.songDetail(mid))?.track_info || {});
  if (!song) return;
  myEvent.emit("setSong", song);
  router.openSongDetailPagePos = { x: 0, y: 0 };
  myEvent.emit("openSongDetailPage", undefined);
}

onMounted(() => {
  submit();
  myEvent.on("toSearch", toSearch);
  const mid = location.hash.substring(1);
  if (mid) setSongFromUrlHash(mid);
});
onUnmounted(() => {
  myEvent.off("toSearch", toSearch);
});
</script>

<template>
  <div class="app" @scroll="tryLoadMore" ref="appRef">
    <div class="container">
      <h1>鹏飞音乐</h1>
      <SearchSong placeholder="搜索" :smartTips="smartTips" @submit="submit" v-model="kw" />
      <SongList :list="filterList" :renderVirtualScroll="render" :parentHeight="songList.length * 80" />
    </div>
  </div>
  <SongPlayer />
  <SongDetailPage />
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
  min-width: 375px;
  position: absolute;
}
.container > h1 {
  font-size: 20px;
  margin: 12px 24px;
  padding: 0;
}
</style>
