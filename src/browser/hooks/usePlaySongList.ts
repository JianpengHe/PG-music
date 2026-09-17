import { ref, onMounted, onUnmounted } from "vue";
import { player } from "../player";
import { myEvent } from "../event";

export function usePlaySongList<T>(format: (data: typeof player.songListMap) => T) {
  const songList = ref(format(player.songListMap));

  function updateState() {
    return (songList.value = format(player.songListMap));
  }

  onMounted(() => {
    myEvent.on("changeSongList", updateState);
  });

  onUnmounted(() => {
    myEvent.off("changeSongList", updateState);
  });

  return songList;
}
