<script setup lang="ts">
import SearchSong from "@/components/SearchSong.vue";
import SongList from "@/components/SongList.vue";
import SongPlayer from "@/components/SongPlayer.vue";

import type { ISong } from "./components/types";
import { ref } from "vue";
import { QQmusicSDK, audio, audioPlus, lyricShow } from "./QQmusicSDK";
import { formatLyricLine } from "../api/common/lyricConvert";

const getSmartTips = (value: string) => QQmusicSDK.smartbox(value);
const songList = ref<ISong[]>([
  {
    id: 1338414,
    mid: "003hFxQh276Cv5",
    name: "最佳损友",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000002FT46H18G1jW_4.jpg?max_age=2592000",
    media_mid: "003C9fBv2K4x8b",
  },
  {
    id: 260678,
    mid: "003aAPj81VWrbL",
    name: "富士山下",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000004Z85XP1c25b7_5.jpg?max_age=2592000",
    media_mid: "001dXZ352YGvqU",
  },
  {
    id: 4830342,
    mid: "001OyHbk2MSIi4",
    name: "十年",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000000GDz8k03UOaI_2.jpg?max_age=2592000",
    media_mid: "002AIxAT3HZwiA",
  },
  {
    id: 4907821,
    mid: "000lVKbP3bCwxu",
    name: "十面埋伏",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000003Hjc6L1WajuE_2.jpg?max_age=2592000",
    media_mid: "0046MwSz36Md8X",
  },
  {
    id: 1251167,
    mid: "0029Zemv0kR1ur",
    name: "葡萄成熟时",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000003J6fvc0bVJon_3.jpg?max_age=2592000",
    media_mid: "000mVAmc4SRnnN",
  },
  {
    id: 9059607,
    mid: "002B2EAA3brD5b",
    name: "不要说话",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000000J1pJ50cDCVE_6.jpg?max_age=2592000",
    media_mid: "000riby13iqt1T",
  },
  {
    id: 1251166,
    mid: "002ejEdb4KTwBw",
    name: "浮夸",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000003J6fvc0bVJon_3.jpg?max_age=2592000",
    media_mid: "00015Tgb2RIq59",
  },
  {
    id: 553145,
    mid: "004ff6bV3wHhjt",
    name: "爱情转移",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M0000042KbE51Xztjx_1.jpg?max_age=2592000",
    media_mid: "001HpQd41w3Hxd",
  },
  {
    id: 1338416,
    mid: "003pQhFw0oBP5p",
    name: "落花流水",
    singer: "陈奕迅",
    pic: "https://y.gtimg.cn/music/photo_new/T002R300x300M000002FT46H18G1jW_4.jpg?max_age=2592000",
    media_mid: "0017qA3R0N506U",
  },
  {
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
    id,
    mid,
    name,
    singer: singer.map(item => item.name).join("、"),
    pic: QQmusicSDK.getMusicImgUrl(album.pmid),
    media_mid: file.media_mid,
  }));
  console.log(songList.value, JSON.stringify(songList.value));
};
const play = async (item: ISong) => {
  if (item.id === curSong.value.id) {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
    return;
  }
  curSong.value = item;
  audio.src = "data:audio/mp3;base64,";
  audioPlus.audioContext.resume();

  const [url, lyric] = await Promise.all([
    QQmusicSDK.playURL(item.mid, `C400${item.media_mid}.m4a`),
    QQmusicSDK.lyric(item.id),
  ]);
  if (url) {
    audio.src = url;
    await audio.play();
    lyricShow.loadLyric(formatLyricLine(lyric, 5), audio.duration);
  }
};
const curSong = ref<ISong>({
  id: 0,
  mid: "",
  name: "",
  singer: "",
  pic: "",
  media_mid: "",
});
</script>

<template>
  <div class="container">
    <h1>鹏飞音乐</h1>
    <SearchSong placeholder="搜索" :getSmartTips="getSmartTips" @submit="submit" />
    <SongList :curSong="curSong" :list="songList" @play="play" />
    <SongPlayer :curSong="curSong" @play="play" />
  </div>
</template>
<style scoped>
.container {
  margin-top: 24px;
  width: 100vmin;
}
.container > h1 {
  font-size: 20px;
  margin: 12px 24px;
  padding: 0;
}
</style>
