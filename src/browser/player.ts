import { AudioPlus } from "../../../code-snippet/browser/AudioPlus";
import { formatLyricLine, LyricShow } from "../api/common/lyricConvert";
import type { IEventList, ISong, ISongInfo, ISongListItem } from "./types";
import { myEvent } from "./event";
import { QQmusicSDK } from "./QQmusicSDK";
const songQualityMap: Record<string, string[]> = {
  size_96aac: ["流畅", "ACC", "C4", "m4a"],
  size_320mp3: ["高品", "MP3", "M8", "mp3"],
  size_flac: ["无损", "FLAC", "F0", "flac"],
};
const audioContext =
  // @ts-ignore
  window.audioContext || (window.audioContext = new AudioContext({ sampleRate: 48000 }));
// window.addEventListener("click", () => audioContext.state === "suspended" && audioContext.resume(), true);
export class Player {
  public readonly songListMap: IEventList["changeSongList"] = new Map(
    JSON.parse(localStorage.getItem("songList") || "[]").map((item: any) => [item.id, item]),
  );
  private currentSongId: ISongInfo["id"] = 0;
  public get currentSong() {
    return this.songListMap.get(this.currentSongId)!;
  }
  public readonly lyricShow = new LyricShow(
    () => myEvent.emit("changeLyric", undefined),
    () => ({ currentTime: this.audio.currentTime, paused: !this.isPlaying }),
  );
  public readonly audio: HTMLVideoElement = document.createElement("video");
  // @ts-ignore
  public readonly audioPlus = new AudioPlus(this.audio, audioContext);
  public playType: "normal" | "loop" = "normal";
  public nextSong() {
    const songs = [...this.songListMap.keys()];
    const currentSongId =
      songs[(songs.indexOf(this.currentSongId) + (this.playType === "loop" ? 0 : 1)) % songs.length];
    myEvent.emit("setSong", this.songListMap.get(currentSongId)!);
  }
  public prevSong() {
    const songs = [...this.songListMap.keys()];
    const currentSongId =
      songs[(songs.indexOf(this.currentSongId) + (this.playType === "loop" ? 0 : songs.length - 1)) % songs.length];
    myEvent.emit("setSong", this.songListMap.get(currentSongId)!);
  }

  // public addOrDeleteSong(song: ISongListItem) {
  //   const oldSong = this.songListMap.get(song.id);
  //   if (oldSong && oldSong.isTemp !== true) {
  //     this.deleteSong(oldSong.id);
  //   } else {
  //     this.addSong(song);
  //   }
  // }
  private changeSongListMap() {
    myEvent.emit("changeSongList", this.songListMap);
    const songList: ISong[] = [...this.songListMap.values()].map(song => ({
      start: song.start,
      name: song.name,
      singer: song.singer,
      id: song.id,
      mid: song.mid,
      pic: song.pic,
      media_mid: song.media_mid,
      mv_mid: song.mv_mid,
      album_name: song.album_name,
    }));
    localStorage.setItem("songList", JSON.stringify(songList));
  }
  public deleteSong(id: ISongInfo["id"]) {
    if (id !== this.currentSongId) {
      this.songListMap.delete(id);
      this.changeSongListMap();
      return;
    }
    const song = this.songListMap.get(id);
    if (song) {
      song.isTemp = true;
      this.changeSongListMap();
    }
  }

  public async addSong(song: ISongListItem) {
    this.songListMap.set(song.id, song);
    this.changeSongListMap();
  }

  constructor() {
    this.audio.style.cssText = `display: none;
    position: fixed;
    z-index: 99999;
    max-width: 100vw;
    max-width: 100dvw;
    max-height: 100vh;
    max-height: 100dvh;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);`;
    //this.audio.loop = true;
    this.audio.controls = true;
    this.audio.crossOrigin = "anonymous";
    document.body.appendChild(this.audio);
    this.audio.addEventListener("ended", () => this.nextSong());
    this.audio.addEventListener("play", () => {
      myEvent.emit("changeLyric", undefined);
      myEvent.emit("playSong", { id: player.currentSongId, start: this.audio.currentTime });
    });
    this.audio.addEventListener("pause", e => {
      this.lyricShow.pause();
      myEvent.emit("pauseSong", { reason: this.audio.currentTime === this.audio.duration ? "end" : "user" });
    });
    this.audio.addEventListener("canplay", () => {
      console.log("canplay");
      this.audio.play();
    });
    this.audio.addEventListener("seeked", () => {
      myEvent.emit("changeLyric", undefined);
    });
    myEvent.on("setSong", async ({ detail }) => {
      this.audio.pause();
      this.audio.src = "data:audio/mp3;base64,";
      this.audioPlus.audioContext.resume();
      this.lyricShow.loadLyric([]);
      /** 旧歌曲 */
      const oldSong = this.songListMap.get(this.currentSongId);
      if (oldSong && oldSong.id !== detail.id) {
        if (oldSong.isTemp) {
          this.songListMap.delete(oldSong.id);
          this.changeSongListMap();
        }
      }
      const songInfo: ISongListItem & ISongInfo =
        !detail.src || !detail.lyric || !detail.srcExpire || detail.srcExpire < Date.now() / 1000
          ? await this.getSrcAndLyric(detail)
          : (detail as ISongInfo);

      setTimeout(() => {
        if (!this.songListMap.has(songInfo.id)) songInfo.isTemp = true;
        this.songListMap.set(songInfo.id, songInfo);
        this.changeSongListMap();
        this.lyricShow.loadLyric(
          songInfo.lyric.length
            ? songInfo.lyric
            : [[{ timeGap: 0, absoluteTime: 0, duration: 0, text: "【暂无歌词】" }]],
        );
        this.currentSongId = songInfo.id;
        this.audio.src = songInfo.src;
        this.audio.currentTime = songInfo.start;
        // this.audio.poster = detail.pic;
        this.audio.style.display = "none";
        // this.audio.dataset.src = detail.src;
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: songInfo.name,
            artist: songInfo.singer,
            album: songInfo.album_name || songInfo.name,
            artwork: [{ src: songInfo.pic }],
          });
        }
        myEvent.emit("loadSong", undefined);
      });
    });
  }
  public playOrPause() {
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play();
    }
  }

  public openVideo(src: string) {
    this.audio.pause();
    this.audio.style.display = "block";
    this.audio.src = src;
    this.audio.play();
  }

  // public play(index: number) {
  //   this.currentIndex = index;
  //   this.audio.src = this.songList[index].src;
  //   this.audio.play();
  // }
  public get isPlaying() {
    return !this.audio.paused && !this.audio.ended;
  }
  public async getSrcAndLyric(song: ISong): Promise<ISongInfo> {
    const q = new URL(window.location.href).searchParams.get("q");
    const songQuality = (q ? songQualityMap[`size_${q}`] : undefined) ?? Object.values(songQualityMap)[0];

    const [src, lyric] = await Promise.all([
      QQmusicSDK.playURL(song.mid, `${songQuality[2]}00${song.media_mid}.${songQuality[3]}`),
      QQmusicSDK.lyric(song.id),
      // QQmusicSDK.songDetail(item.mid),
      // QQmusicSDK.mvURL(item.mv_mid),
      // new Promise(resolve => setTimeout(resolve, 360)),
    ]);
    return { ...song, src, srcExpire: Infinity, lyric: formatLyricLine(lyric, 5) };
  }
}

// export const audioPlus = new AudioPlus(this.audio);
// // @ts-ignore
// window.audioPlus = audioPlus;

export const player = new Player();

if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => player.playOrPause());
  navigator.mediaSession.setActionHandler("pause", () => player.playOrPause());
  navigator.mediaSession.setActionHandler("previoustrack", () => player.prevSong());
  navigator.mediaSession.setActionHandler("nexttrack", () => player.nextSong());
  navigator.mediaSession.setActionHandler("seekto", details => {
    if (details.seekTime == null) return;
    player.audio.currentTime = details.seekTime;
  });

  navigator.mediaSession.setActionHandler("seekbackward", details => {
    const offset = details.seekOffset ?? 10;
    player.audio.currentTime = Math.max(0, player.audio.currentTime - offset);
  });

  navigator.mediaSession.setActionHandler("seekforward", details => {
    const offset = details.seekOffset ?? 10;
    player.audio.currentTime = Math.min(player.audio.duration, player.audio.currentTime + offset);
  });
}

window.addEventListener("keydown", e => {
  const currentSong = player.currentSong;
  if (!currentSong) return;
  console.log(e.code, e.ctrlKey);
  switch (e.code) {
    case "Space":
      player.playOrPause();
      break;
    case "ArrowRight":
    case "ArrowLeft":
      const xs = e.code === "ArrowLeft" ? -1 : 1;
      const time = e.ctrlKey
        ? undefined
        : currentSong.lyric?.[player.lyricShow.currentLineIndex + xs]?.[0]?.absoluteTime;
      player.audio.currentTime = time ? time / 1000 : player.audio.currentTime + (e.ctrlKey ? 10 : 5) * xs;
      break;
    case "ArrowDown":
      player.audioPlus.volume = Math.max(0, player.audioPlus.volume - (e.ctrlKey ? 0.2 : 0.1));
      break;
    case "ArrowUp":
      player.audioPlus.volume = Math.min(1, player.audioPlus.volume + (e.ctrlKey ? 0.2 : 0.1));
      break;
    case "KeyM":
      player.audioPlus.volume = 0;
      break;
  }
});

export function debouncedFn(callback: () => Promise<void>, minDelay = 500) {
  let needCall = false;
  let cdTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const handle = () => {
    const now = performance.now();
    if (now < cdTime) return scheduleNext();
    needCall = false;
    cdTime = Infinity;
    callback().finally(() => {
      cdTime = now + minDelay;
      if (needCall) scheduleNext();
    });
  };
  const scheduleNext = () => {
    needCall = true;
    if (cdTime === Infinity || timer !== null) return;
    const delay = cdTime - performance.now() + 10;
    if (delay > 0) {
      timer = setTimeout(() => {
        timer = null;
        handle();
      }, delay);
    } else {
      handle();
    }
  };

  return handle;
}
