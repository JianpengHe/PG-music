<script setup lang="ts">
import "./style.css";

import SearchSong from "@/components/SearchSong.vue";
import SongList from "@/components/SongList.vue";
import SongPlayer from "@/components/SongPlayer.vue";
import SongDetailPage from "@/components/SongDetailPage.vue";
import type { ISong } from "./types";
import { ref } from "vue";
import { QQmusicSDK } from "./QQmusicSDK";

const getSmartTips = (value: string) => QQmusicSDK.smartbox(value);
const songList = ref<ISong[]>(
  location.protocol === "https:"
    ? []
    : [
        {
          start: 0,
          id: 1338414,
          mid: "003hFxQh276Cv5",
          name: "最佳损友",
          singer: "陈奕迅",
          pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000002FT46H18G1jW_4.jpg?max_age=2592000",
          media_mid: "003C9fBv2K4x8b",
        },
        {
          start: 0,
          id: 260678,
          mid: "003aAPj81VWrbL",
          name: "富士山下",
          singer: "陈奕迅",
          pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000004Z85XP1c25b7_5.jpg?max_age=2592000",
          media_mid: "001dXZ352YGvqU",
          mv_mid: "k0012md5982",
        },
        {
          start: 0,
          id: 1331307,
          mid: "000Cmo8Q2pBpZs",
          name: "Merry-Go-Round of Life",
          singer: "久石让",
          pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M0000000aeS72qwLag_2.jpg?max_age=2592000",
          media_mid: "000BH1Ng2HFfvC",
        },
        {
          start: 0,
          id: 253968019,
          mid: "002xbnUT2NiCIm",
          name: "人生的旋转木马",
          singer: "久石让",
          pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000000bMJur4HuxyY_4.jpg?max_age=2592000",
          media_mid: "002JzmZq3esxNS",
        },
        {
          start: 0,
          id: 1251167,
          mid: "0029Zemv0kR1ur",
          name: "葡萄成熟时",
          singer: "陈奕迅",
          pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000003J6fvc0bVJon_3.jpg?max_age=2592000",
          media_mid: "000mVAmc4SRnnN",
          mv_mid: "q0010Lj82uC",
        },
      ],
);
let kw = "";
let curPageNum = 1;
let isBuy = false;
const submit = async (value: string, pageNum = 1) => {
  isBuy = true;
  console.log("发起搜索", value, pageNum);
  kw = value;
  curPageNum = pageNum;
  const res = (await QQmusicSDK.search(value, pageNum)).list.map(({ id, mid, name, singer, album, file, mv }) => ({
    start: 0,
    id,
    mid,
    name,
    singer: singer.map(item => item.name).join("、"),
    pic: QQmusicSDK.getMusicImgUrl(album.pmid),
    media_mid: file.media_mid,
    mv_mid: mv?.vid,
  }));
  const map = new Map(pageNum === 1 ? [] : songList.value.map(item => [item.id, item]));
  for (const item of res) map.set(item.id, item);
  songList.value = [...map.values()];
  // console.log(songList.value, JSON.stringify(songList.value));
  setTimeout(tryLoadMore, 100);
  isBuy = false;
};

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
  if (!appRef.value || isBuy || !kw) return;
  const { scrollTop, scrollHeight, clientHeight } = appRef.value;
  if (scrollHeight - scrollTop - clientHeight > clientHeight * 0.5) return;
  submit(kw, curPageNum + 1);
}
</script>

<template>
  <div class="app" @scroll="tryLoadMore" ref="appRef">
    <div class="container">
      <h1>鹏飞音乐</h1>
      <SearchSong placeholder="搜索" :getSmartTips="getSmartTips" @submit="submit" />
      <SongList :list="songList" :openSongDetailPage="openSongDetailPage" />
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
