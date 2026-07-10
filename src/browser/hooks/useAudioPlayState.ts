import { ref, onMounted, onUnmounted } from "vue";
import { audio } from "../QQmusicSDK";

export function useAudioPlayState() {
  const isPlaying = ref(false);

  function updateState() {
    isPlaying.value = !audio.paused && !audio.ended;
  }

  function onPlay() {
    isPlaying.value = true;
  }

  function onPause() {
    isPlaying.value = false;
  }

  function onEnded() {
    isPlaying.value = false;
  }

  onMounted(() => {
    // 初始化状态
    updateState();

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
  });

  onUnmounted(() => {
    audio.removeEventListener("play", onPlay);
    audio.removeEventListener("pause", onPause);
    audio.removeEventListener("ended", onEnded);
  });

  return {
    isPlaying,
  };
}
