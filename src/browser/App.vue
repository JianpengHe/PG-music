<script setup lang="ts">
import SearchSong from "@/components/SearchSong.vue";
import { QQmusicBrowserSDK } from "../api/QQmusicBrowserSDK";
const QQmusic = new QQmusicBrowserSDK(
  "https://tool.hejianpeng.cn/music/api",
  "https://tool.hejianpeng.cn/u.y.qq.com/cgi-bin/musics.fcg",
);
const getSmartTips = (value: string) => QQmusic.smartbox(value);
const submit = async (value: string) => {
  console.log("发起搜索", value);
  console.log(await QQmusic.search(value));
};
</script>

<template>
  <div class="app">
    <div class="container">
      <h1>鹏飞音乐</h1>
      <SearchSong placeholder="请输入歌名搜索" :getSmartTips="getSmartTips" @submit="submit" />
    </div>
  </div>
</template>
<style scoped>
.app {
  background-color: #f2f2f2;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
}
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
