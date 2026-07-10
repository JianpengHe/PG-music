import { QQmusicBrowserSDK } from "../api/QQmusicBrowserSDK";
import { AudioPlus } from "../../../code-snippet/browser/AudioPlus";
import { LyricShow } from "../api/common/lyricConvert";

export const QQmusicSDK = new QQmusicBrowserSDK(
  "https://tool.hejianpeng.cn/music/api",
  "https://tool.hejianpeng.cn/u.y.qq.com/cgi-bin/musics.fcg",
);
export const audio = document.createElement("audio");
audio.style.display = "none";
audio.loop = true;
audio.crossOrigin = "anonymous";
document.body.appendChild(audio);
export const audioPlus = new AudioPlus(audio);
// window.audioPlus = audioPlus;

export const lyricShow = new LyricShow(
  str => {
    const lyric = document.getElementById("lyric") as HTMLElement;
    if (lyric) lyric.innerHTML = str;
  },
  () => (audio.paused ? -1 : audio.currentTime),
);
audio.addEventListener("play", () => lyricShow.play());
audio.addEventListener("pause", () => lyricShow.pause());
