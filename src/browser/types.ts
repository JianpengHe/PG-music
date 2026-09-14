import type { LyricToken } from "../api/common/lyricConvert";

export type ISong = {
  start: number;
  name: string;
  singer: string;
  id: number;
  mid: string;
  pic: string;
  media_mid: string;
};

export type ISongInfo = ISong & { src: string; lyric: LyricToken[][] };

export type IEventList = {
  setSong: ISongInfo;
  playSong: Pick<IEventList["setSong"], "id" | "start">;
  pauseSong: { reason: "user" | "end" | "load" };
};

type EventMap = {
  [K in keyof IEventList]: CustomEvent<IEventList[K]>;
};

declare global {
  interface WindowEventMap extends EventMap {}
}
