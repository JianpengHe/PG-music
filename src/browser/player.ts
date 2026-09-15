import { AudioPlus } from "../../../code-snippet/browser/AudioPlus";
import { LyricShow } from "../api/common/lyricConvert";
import type { ISongInfo } from "./types";
import { myEvent } from "./event";

class Player {
  public readonly songList: Map<ISongInfo["id"], ISongInfo & { isTemp?: boolean }> = new Map();
  private currentSongId: ISongInfo["id"] = 0;
  public get currentSong() {
    return this.songList.get(this.currentSongId);
  }
  public readonly lyricShow = new LyricShow(
    () => myEvent.emit("changeLyric", undefined),
    () => ({ currentTime: this.audio.currentTime, paused: !this.isPlaying }),
  );
  private readonly audio: HTMLVideoElement = document.createElement("video");
  // @ts-ignore
  public readonly audioPlus = new AudioPlus(this.audio, window.audioContext);
  constructor() {
    this.audio.style.cssText = `display: none;
    position: fixed;
    z-index: 99999;
    max-width: 100vw;
    max-height: 100vh;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);`;
    //this.audio.loop = true;
    this.audio.controls = true;
    this.audio.crossOrigin = "anonymous";
    document.body.appendChild(this.audio);
    this.audio.addEventListener("ended", () => {
      this.audio.currentTime = 0;
      this.audio.play();
    });
    this.audio.addEventListener("play", () => {
      myEvent.emit("changeLyric", undefined);
      myEvent.emit("playSong", { id: player.currentSongId, start: this.audio.currentTime });
    });
    this.audio.addEventListener("pause", e => {
      console.log(e);
      this.lyricShow.pause();
      myEvent.emit("pauseSong", { reason: "user" });
    });
    this.audio.addEventListener("canplay", () => {
      console.log("canplay");
      this.audio.play();
    });
    this.audio.addEventListener("seeked", () => {
      myEvent.emit("changeLyric", undefined);
    });
    myEvent.on("setSong", ({ detail }) => {
      this.audio.pause();
      this.audio.src = "data:audio/mp3;base64,";
      this.audioPlus.audioContext.resume();
      this.lyricShow.loadLyric(detail.lyric);
      setTimeout(() => {
        if (!this.songList.has(detail.id)) this.songList.set(detail.id, { ...detail, isTemp: true });
        this.currentSongId = detail.id;
        this.audio.src = detail.src;
        this.audio.currentTime = detail.start;
        // this.audio.poster = detail.pic;
        this.audio.style.display = "none";
        // this.audio.dataset.src = detail.src;
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
}

// export const audioPlus = new AudioPlus(this.audio);
// // @ts-ignore
// window.audioPlus = audioPlus;

export const player = new Player();
