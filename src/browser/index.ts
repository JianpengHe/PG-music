import { QQmusicBrowserSDK } from "../api/common/QQmusicBrowserSDK";

new QQmusicBrowserSDK("", "https://tool.hejianpeng.cn/u.y.qq.com/cgi-bin/musicu.fcg")
  .search("陈奕迅")

  // .lyric(260678)
  .then(d => {
    console.log(d);
  });
