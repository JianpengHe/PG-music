import { myEvent } from "./event";
import { Player, player } from "./player";

export class Router {
  constructor(private player: Player) {
    window.addEventListener("hashchange", () => this.hashchange());
    myEvent.on("loadSong", () => this.updateHash());
  }
  public openSongDetailPagePos: { x: number; y: number } | null = null;
  public openSongDetailPage(detail?: PointerEvent) {
    this.openSongDetailPagePos = detail
      ? {
          x: detail.clientX - innerWidth / 2,
          y: detail.clientY - innerHeight / 2,
        }
      : null;

    this.updateHash();
    myEvent.emit("openSongDetailPage", undefined);
  }
  private hashchange() {
    // if (!this.openSongDetailPagePos) return;

    const url = new URL(window.location.href);

    if (!url.hash) {
      this.openSongDetailPagePos = null;
    } else {
      this.openSongDetailPagePos = { x: 0, y: 0 };
      const hash = url.hash.replace("#", "");
      if (hash && this.player.currentSong?.mid !== hash) {
        for (const [id, song] of this.player.songListMap) {
          if (song.mid === hash) {
            myEvent.emit("setSong", song);
            break;
          }
        }
      }
    }
    myEvent.emit("openSongDetailPage", undefined);
  }
  public updateHash() {
    const needHash = Boolean(this.openSongDetailPagePos);
    const url = new URL(window.location.href);
    const oldHash = url.hash;
    url.hash = needHash ? "#" + (this.player.currentSong?.mid || "") : "";
    if ((!oldHash && needHash) || (!needHash && oldHash)) {
      // console.log("pushState", String(url));
      history.pushState({}, "", String(url));
    } else if (oldHash !== url.hash) {
      // console.log("replaceState", String(url));
      history.replaceState({}, "", String(url));
    }
  }
}

export const router = new Router(player);
