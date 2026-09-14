import { ref, onMounted, onUnmounted } from "vue";
import { player } from "../player";
import { myEvent } from "../event";

export function usePlaySongInfo() {
  const songInfo = ref({ ...player.currentSong, isPlaying: player.isPlaying });

  function updateState(e: Event) {
    songInfo.value = { ...player.currentSong, isPlaying: player.isPlaying };
  }

  onMounted(() => {
    myEvent.on("playSong", updateState);
    myEvent.on("pauseSong", updateState);
  });

  onUnmounted(() => {
    myEvent.off("playSong", updateState);
    myEvent.off("pauseSong", updateState);
  });

  return { songInfo };
}
