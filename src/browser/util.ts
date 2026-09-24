export const songQualityMap: Record<string, string[]> = {
  size_96aac: ["流畅", "ACC", "C4", "m4a"],
  size_320mp3: ["高品", "MP3", "M8", "mp3"],
  size_flac: ["无损", "FLAC", "F0", "flac"],
};
export enum EPlayType {
  Normal,
  Loop,
  Random,
}
export enum ELocalStorageKey {
  SongList = "songList",
  PlayType = "playType",
}
const LocalStorageKeyPrefix = "PG-music-";
export const getLocalStorage = (key: ELocalStorageKey) => localStorage.getItem(LocalStorageKeyPrefix + key);
export const setLocalStorage = (key: ELocalStorageKey, value: string) =>
  localStorage.setItem(LocalStorageKeyPrefix + key, value);
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
