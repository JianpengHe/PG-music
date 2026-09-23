import { player } from "./player";

export class DownloadItem {
  private readonly totalSize: number = Infinity;
  private loadedSize: number = 0;
  public isClosed: boolean = false;
  public readonly waitClosed: Promise<void>;

  private constructor(
    public fileName: string,
    res: Response,
    private readonly abortController: AbortController,
  ) {
    const contentLength = res.headers.get("Content-Length");
    if (contentLength) this.totalSize = Number(contentLength || "0") || Infinity;

    const reader = res.body?.getReader();
    if (!reader) throw new Error("response body is null");

    this.waitClosed = new Promise<void>(async resolve => {
      const body: Uint8Array[] = [];
      try {
        while (!abortController.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          this.loadedSize += value.byteLength;
          body.push(value);
        }
      } finally {
        reader.releaseLock();
        this.isClosed = true;
        resolve();
        if (!abortController.signal.aborted) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob(body));
          a.download = this.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
        }
      }
    });
  }
  public get info() {
    return {
      fileName: this.fileName,
      loadedSize: this.loadedSize,
      totalSize: this.totalSize,
      progress: this.loadedSize / this.totalSize,
      isClosed: this.isClosed,
    };
  }
  public stop() {
    this.abortController.abort();
  }
  static async create(fileName: string, url: string) {
    const abortController = new AbortController();
    const res = await fetch(url, { signal: abortController.signal });
    return new DownloadItem(fileName, res, abortController);
  }
}

export class Downloader {
  private downloadMap: Map<string, DownloadItem> = new Map();
  public async add() {
    const fileName = this.fileName;
    if (!fileName || this.downloadMap.has(fileName)) return false;
    const downloadItem = await DownloadItem.create(fileName, player.audio.src);
    this.downloadMap.set(fileName, downloadItem);
    downloadItem.waitClosed.finally(() => this.downloadMap.delete(fileName));
    return downloadItem;
  }
  public get fileName() {
    if (!player.audio.src) return "";
    const url = new URL(player.audio.src);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return `${player.currentSong.singer} - ${player.currentSong.name}.${url.pathname.split(".").pop() || ".mp3"}`;
  }
  public getDownloadItems(fileName = this.fileName) {
    return this.downloadMap.get(fileName);
  }
}

// export const audioPlus = new AudioPlus(this.audio);
// // @ts-ignore
// window.audioPlus = audioPlus;

export const downloader = new Downloader();
