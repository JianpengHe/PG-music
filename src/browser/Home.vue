<script setup lang="ts">
import SearchSong from "@/components/SearchSong.vue";
import SongList from "@/components/SongList.vue";
import SongPlayer from "@/components/SongPlayer.vue";
import SongDetailPage from "@/components/SongDetailPage.vue";
import type { ISong } from "./types";
import { ref } from "vue";
import { QQmusicSDK } from "./QQmusicSDK";

const getSmartTips = (value: string) => QQmusicSDK.smartbox(value);
const songList = ref<ISong[]>([
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
    id: 1512700,
    mid: "000pSVpT4VDmea",
    name: "アシタカせっ記",
    singer: "久石让",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000000EYyXD1a5HEO_3.jpg?max_age=2592000",
    media_mid: "00058XWY0BPfzO",
  },
  {
    start: 0,
    id: 4830342,
    mid: "001OyHbk2MSIi4",
    name: "十年",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000000GDz8k03UOaI_2.jpg?max_age=2592000",
    media_mid: "002AIxAT3HZwiA",
  },
  {
    start: 0,
    id: 4907821,
    mid: "000lVKbP3bCwxu",
    name: "十面埋伏",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000003Hjc6L1WajuE_2.jpg?max_age=2592000",
    media_mid: "0046MwSz36Md8X",
  },
  {
    start: 0,
    id: 1251167,
    mid: "0029Zemv0kR1ur",
    name: "葡萄成熟时",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000003J6fvc0bVJon_3.jpg?max_age=2592000",
    media_mid: "000mVAmc4SRnnN",
  },
  {
    start: 0,
    id: 9059607,
    mid: "002B2EAA3brD5b",
    name: "不要说话",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000000J1pJ50cDCVE_6.jpg?max_age=2592000",
    media_mid: "000riby13iqt1T",
  },
  {
    start: 0,
    id: 1251166,
    mid: "002ejEdb4KTwBw",
    name: "浮夸",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000003J6fvc0bVJon_3.jpg?max_age=2592000",
    media_mid: "00015Tgb2RIq59",
  },
  {
    start: 0,
    id: 553145,
    mid: "004ff6bV3wHhjt",
    name: "爱情转移",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M0000042KbE51Xztjx_1.jpg?max_age=2592000",
    media_mid: "001HpQd41w3Hxd",
  },
  {
    start: 0,
    id: 1338416,
    mid: "003pQhFw0oBP5p",
    name: "落花流水",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000002FT46H18G1jW_4.jpg?max_age=2592000",
    media_mid: "0017qA3R0N506U",
  },
  {
    start: 0,
    id: 4907894,
    mid: "004CU50m2JjBjr",
    name: "单车",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000004S8YQr3UmEbG_2.jpg?max_age=2592000",
    media_mid: "000wa9ED359rBP",
  },
]);
const submit = async (value: string) => {
  console.log("发起搜索", value);
  songList.value = (await QQmusicSDK.search(value)).list.map(({ id, mid, name, singer, album, file }) => ({
    start: 0,
    id,
    mid,
    name,
    singer: singer.map(item => item.name).join("、"),
    pic: QQmusicSDK.getMusicImgUrl(album.pmid),
    media_mid: file.media_mid,
  }));
  console.log(songList.value, JSON.stringify(songList.value));
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
</script>

<template>
  <div class="container">
    <h1>鹏飞音乐</h1>
    <SearchSong placeholder="搜索" :getSmartTips="getSmartTips" @submit="submit" />
    <SongList :list="songList" :openSongDetailPage="openSongDetailPage" />
    <SongPlayer :x="songDetailPage.x" :y="songDetailPage.y" :openSongDetailPage="openSongDetailPage" />
    <SongDetailPage :x="songDetailPage.x" :y="songDetailPage.y" :openSongDetailPage="openSongDetailPage" />
  </div>
</template>
<style scoped>
.container {
  margin-top: 24px;
  width: 100vmin;
  position: absolute;
}
.container > h1 {
  font-size: 20px;
  margin: 12px 24px;
  padding: 0;
}
</style>
