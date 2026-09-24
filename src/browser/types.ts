import type { LyricToken } from "../api/common/lyricConvert";

export type ISong = {
  start: number;
  name: string;
  singer: string;
  id: number;
  mid: string;
  pic: string;
  media_mid: string;
  mv_mid?: string;
  album_name: string;
  quicklyPos: number[];
};
type ISongPlayInfo = { src: string; srcExpire: number; lyric: LyricToken[][] };
export type ISongInfo = ISong & ISongPlayInfo;
export type ISongListItem = ISong & Partial<ISongPlayInfo> & { isTemp?: boolean };

export type IEventList = {
  setSong: ISongListItem;
  loadSong: void;
  playSong: Pick<IEventList["setSong"], "id" | "start">;
  pauseSong: { reason: "user" | "end" | "load" };
  changeLyric: void;
  changeSongList: Map<ISongInfo["id"], ISongListItem>;
  openSongDetailPage: void; //: { clientX: number; clientY: number } | null;
};

type EventMap = {
  [K in keyof IEventList]: CustomEvent<IEventList[K]>;
};

declare global {
  interface WindowEventMap extends EventMap {}
}
