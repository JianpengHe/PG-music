<script setup lang="ts">
import { usePlaySongInfo } from "../hooks/usePlaySongInfo";
import { myEvent } from "../event";
import { LyricShow } from "../../api/common/lyricConvert";
import { player } from "../player";
import { onMounted, onUnmounted, ref } from "vue";
import { Play } from "@icon-park/vue-next";
import { formatTime } from "../util";

/**
 * 歌词上下预留空间。
 *
 * 通过给歌词内容增加上下 margin，
 * 使当前播放歌词能够尽量保持在歌词滚动容器的垂直中心位置。
 *
 * 初始值使用当前窗口高度的 40%，
 * 在歌词 DOM 挂载后会根据实际滚动容器高度重新计算。
 */
const lyricVerticalPadding = ref(innerHeight * 0.4);

/**
 * 获取当前播放歌曲信息。
 */
const { songInfo } = usePlaySongInfo();

/**
 * 歌词内容 DOM 引用。
 *
 * 真正负责滚动的是 lyricRef 的父元素，
 * lyricRef 本身主要用于获取歌词列表以及当前 DOM 状态。
 */
const lyricRef = ref<HTMLDivElement>();

/**
 * 当前播放器正在使用的歌词显示数据。
 *
 * lyricData 中包含当前播放歌词行、歌词字符动画等信息。
 */
const lyric = ref<LyricShow["lyricData"]>(player.lyricShow.lyricData);

/**
 * 用户手动滚动歌词时当前预览的歌词行索引。
 *
 * -1 表示当前没有处于歌词预览状态。
 *
 * 当用户滚动歌词列表时，会根据滚动位置实时计算这个索引，
 * 并通过 UI 显示一个播放按钮和对应的歌曲时间。
 */
const previewLineIndex = ref<number>(-1);

/**
 * 歌词单行固定高度。
 *
 * 歌词滚动位置和当前歌词行索引的计算都依赖这个高度。
 */
const LYRIC_LINE_HEIGHT = 28;

/**
 * 用户手动操作歌词后的自动跟随恢复时间。
 *
 * 0：
 * 表示当前没有处于手动滚动状态，可以正常自动跟随歌词。
 *
 * Infinity：
 * 表示用户正在进行触摸拖动，在 touchend 之前一直保持手动滚动状态。
 *
 * 普通时间戳：
 * 表示用户最近一次操作结束后的保护时间。
 * 在保护时间内，即使播放器歌词发生变化，也不会自动滚动歌词列表。
 */
let manualScrollEndTime = 0;

/**
 * 当前 requestAnimationFrame 任务 ID。
 *
 * 用于保证歌词预览状态最多只有一个 RAF 循环，
 * 同时也方便组件销毁时取消未完成的动画任务。
 */
let rafId = 0;

/**
 * 更新歌词显示状态并根据播放器当前歌词自动滚动列表。
 *
 * 主要负责：
 *
 * 1. 同步播放器最新的歌词数据。
 * 2. 根据当前滚动容器高度计算歌词上下预留空间。
 * 3. 在用户没有主动浏览歌词时，让歌词列表自动跟随当前播放行。
 *
 * 当用户正在手动浏览歌词时，不会执行自动滚动，
 * 避免播放器自动切换歌词时强行把用户拉回当前播放位置。
 */
function changeLyric() {
  /**
   * 同步播放器当前最新的歌词显示数据。
   */
  lyric.value = player.lyricShow.lyricData;

  const lyricContentDom = lyricRef.value;

  /**
   * 根据实际歌词滚动容器高度重新计算上下预留空间。
   *
   * 减去一行歌词高度后除以 2，
   * 可以让歌词行的中心大致位于滚动容器的垂直中心。
   */
  if (lyricContentDom)
    lyricVerticalPadding.value = (lyricContentDom.parentElement!.clientHeight - LYRIC_LINE_HEIGHT) / 2;

  /**
   * 以下情况不执行歌词自动滚动：
   *
   * 1. 歌词 DOM 尚未挂载；
   * 2. 用户当前正在手动浏览歌词；
   * 3. 当前歌曲没有歌词；
   * 4. 当前播放歌词行索引无效。
   */
  if (!lyricContentDom || manualScrollEndTime || (songInfo.value.lyric?.length ?? 0) === 0 || lyric.value.lineIndex < 0)
    return;

  /**
   * 根据当前播放歌词行计算滚动位置。
   *
   * 每行歌词高度固定为 28px，
   * 因此可以直接通过歌词行索引计算 scrollTop。
   *
   * 使用 smooth 可以让歌词切换时产生平滑滚动效果。
   */
  lyricContentDom.parentElement?.scrollTo({
    top: lyric.value.lineIndex * LYRIC_LINE_HEIGHT,
    behavior: "smooth",
  });
}

/**
 * 用户通过鼠标滚轮浏览歌词。
 *
 * 每次滚轮操作都会将手动浏览保护时间延长 3 秒。
 * 在这段时间内，播放器不会自动滚动歌词列表。
 */
function handleLyricWheel() {
  /**
   * 延长 3 秒手动浏览保护时间。
   *
   * 如果用户持续滚动歌词，每次滚轮事件都会重新计算这个时间，
   * 因此只要用户持续操作，就不会恢复自动跟随。
   */
  manualScrollEndTime = performance.now() + 3000;

  /**
   * 立即更新当前预览歌词行。
   */
  updatePreviewLineIndex();
}

/**
 * 根据歌词列表当前滚动位置更新预览歌词行。
 *
 * 用户手动浏览歌词期间，会通过 requestAnimationFrame 持续检测
 * 当前滚动位置，并更新 previewLineIndex。
 *
 * 当用户停止操作超过 3 秒后：
 *
 * 1. 清除手动浏览状态；
 * 2. 清除当前预览歌词行；
 * 3. 通知播放器恢复正常的歌词自动跟随。
 */
function updatePreviewLineIndex() {
  /**
   * 防止同一时间存在多个 requestAnimationFrame 循环。
   *
   * 例如连续触发多个 wheel 事件时，
   * 如果不取消旧任务，可能会同时运行多个歌词位置检测循环。
   */
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  const lyricContentDom = lyricRef.value;
  const previousPreviewLineIndex = previewLineIndex.value;
  const currentTime = performance.now();

  /**
   * 判断用户是否已经结束手动浏览。
   *
   * 歌词 DOM 不存在或者保护时间已经结束，
   * 都认为当前手动浏览状态已经结束。
   */
  const isPreviewEnded = !lyricContentDom || manualScrollEndTime < currentTime;

  /**
   * 根据当前滚动位置计算用户正在预览的歌词行。
   *
   * scrollTop / LYRIC_LINE_HEIGHT：
   * 根据歌词行高度计算当前滚动到了第几行。
   *
   * Math.round：
   * 取距离当前滚动位置最近的歌词行。
   *
   * Math.max / Math.min：
   * 防止计算结果超出歌词列表的有效索引范围。
   */
  const currentPreviewLineIndex = isPreviewEnded
    ? -1
    : Math.max(
        0,
        Math.min(
          lyricContentDom.children.length - 1,
          Math.round(lyricContentDom.parentElement!.scrollTop / LYRIC_LINE_HEIGHT),
        ),
      );

  /**
   * 手动浏览结束。
   */
  if (isPreviewEnded) {
    /**
     * 清除手动浏览状态。
     */
    manualScrollEndTime = 0;

    /**
     * 通知播放器恢复正常的歌词自动跟随。
     */
    myEvent.emit("changeLyric", undefined);
  } else {
    /**
     * 用户仍然处于歌词预览状态。
     *
     * 下一帧继续检测滚动位置，
     * 从而实时更新当前预览歌词行。
     */
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updatePreviewLineIndex();
    });
  }

  /**
   * 只有当前预览歌词行发生变化时，
   * 才更新 Vue 响应式数据。
   *
   * 这样可以避免每一帧都触发响应式更新。
   */
  if (previousPreviewLineIndex !== currentPreviewLineIndex) {
    previewLineIndex.value = currentPreviewLineIndex;

    /**
     * 用户滚动到了新的歌词行。
     *
     * 普通鼠标滚轮操作需要重新延长 3 秒保护时间。
     *
     * Infinity 表示当前处于触摸拖动状态，
     * 此时不能将 Infinity 修改为普通的时间戳，
     * 必须等待 touchend 后才能进入 3 秒保护期。
     */
    if (currentPreviewLineIndex !== -1 && manualScrollEndTime !== Infinity) {
      manualScrollEndTime = currentTime + 3000;
    }
  }

  /**
   * 返回当前预览歌词行索引。
   */
  return currentPreviewLineIndex;
}

/**
 * 开始处理歌词列表的触摸手势。
 *
 * 当手指移动距离超过一行歌词的高度后，
 * 才认为用户真正开始拖动歌词，并进入手动预览模式。
 */
function handleLyricTouchStart(e: TouchEvent) {
  /** 记录本次触摸开始时手指的垂直坐标。 */
  const touchStartY = e.touches[0].clientY;

  /** 标记本次触摸是否已经进入歌词拖动状态。 */
  let isDragging = false;

  /**
   * 检测手指是否已经产生足够明显的垂直移动。
   *
   * 只有超过歌词行高后，才进入手动预览状态，
   * 从而避免普通点击歌词时触发预览 UI 闪烁。
   */
  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) return;

    const currentTouchY = e.touches[0].clientY;

    if (Math.abs(currentTouchY - touchStartY) <= LYRIC_LINE_HEIGHT) return;

    isDragging = true;

    /**
     * Infinity 表示用户当前仍在进行触摸拖动，
     * 播放器自动切换歌词时不应强制滚动列表。
     */
    manualScrollEndTime = Infinity;

    /**
     * 立即根据当前滚动位置计算用户正在预览的歌词行。
     */
    updatePreviewLineIndex();
  };

  /**
   * 触摸结束后进入普通的 3 秒保护期。
   *
   * 此时用户已经结束拖动，但仍需要暂时禁止播放器
   * 自动将歌词列表滚回当前播放行。
   */
  const handleTouchEnd = () => {
    handleLyricWheel();

    /**
     * 本次触摸手势已经结束，
     * 移除当前手势对应的全局事件监听。
     */
    window.removeEventListener("touchend", handleTouchEnd);
    window.removeEventListener("touchmove", handleTouchMove);
  };

  /**
   * 在 window 上监听 touchend 和 touchmove，
   * 可以避免手指移动到歌词容器外部后无法继续接收触摸事件。
   */
  window.addEventListener("touchend", handleTouchEnd);
  window.addEventListener("touchmove", handleTouchMove);
}

/**
 * 获取当前预览歌词行对应的歌曲播放时间。
 *
 * 歌词 absoluteTime 使用毫秒，
 * HTMLAudioElement.currentTime 使用秒，
 * 因此这里需要进行毫秒到秒的转换。
 */
function getPreviewLineTime() {
  return (songInfo.value.lyric?.[previewLineIndex.value]?.[0]?.absoluteTime ?? 0) / 1000;
}

/**
 * 设置播放器当前播放时间。
 *
 * 传入时间，用于点击具体歌词行时直接跳转。
 */
function setSongTime(time: number) {
  /**
   * 将播放器播放进度跳转到指定时间。
   */
  player.audio.currentTime = time;

  /**
   * 立即结束歌词手动浏览状态。
   *
   * 后续播放器可以重新自动跟随当前播放歌词。
   */
  manualScrollEndTime = 0;

  /**
   * 清除当前预览歌词行。
   */
  previewLineIndex.value = -1;
}

/**
 * 组件挂载后：
 *
 * 1. 监听歌曲加载事件；
 * 2. 监听歌词变化事件；
 * 3. 主动触发一次歌词同步。
 */
onMounted(() => {
  myEvent.on("loadSong", changeLyric);
  myEvent.on("changeLyric", changeLyric);

  /**
   * 主动触发歌词初始化，
   * 确保组件首次渲染时能够同步播放器当前状态。
   */
  myEvent.emit("changeLyric", undefined);
});

/**
 * 组件卸载时：
 *
 * 1. 移除歌曲加载事件；
 * 2. 移除歌词变化事件；
 * 3. 通知其他逻辑恢复正常歌词状态；
 * 4. 取消可能还存在的 requestAnimationFrame 任务。
 */
onUnmounted(() => {
  myEvent.off("loadSong", changeLyric);
  myEvent.off("changeLyric", changeLyric);

  /**
   * 通知播放器恢复正常的歌词状态。
   */
  myEvent.emit("changeLyric", undefined);

  /**
   * 组件销毁时取消歌词预览循环，
   * 避免组件销毁后 RAF 仍然持续执行。
   */
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
});
</script>

<template>
  <div class="song-detail-lyric">
    <div class="song-detail-lyric-scroll" @wheel="handleLyricWheel" @touchstart="handleLyricTouchStart">
      <div
        ref="lyricRef"
        class="song-detail-lyric-content"
        :class="{ musicPlaying: songInfo.isPlaying }"
        :style="{ margin: `${lyricVerticalPadding}px 0`, '--lyric-line-height': `${LYRIC_LINE_HEIGHT}px` }"
      >
        <div
          v-for="(line, lineIndex) in songInfo.lyric"
          :key="songInfo.id + lineIndex"
          :class="{ lyric: lyric.lineIndex === lineIndex }"
          @click.stop="setSongTime(line[0].absoluteTime / 1000)"
          title="点击播放此行"
        >
          <span
            v-if="lyric.lineIndex === lineIndex"
            v-for="(ch, chIndex) in lyric.data"
            :style="{
              animationDelay: `${ch.delay}ms`,
              animationDuration: `${ch.duration}ms`,
            }"
            :key="ch.html + chIndex"
            :data-html="ch.delay + '.' + chIndex"
          >
            {{ ch.text }}
          </span>

          <span v-else v-for="ch in line">
            {{ ch.text }}
          </span>
        </div>
      </div>
    </div>

    <div
      v-show="previewLineIndex >= 0"
      class="quickly-play-line"
      :style="{ top: `${lyricVerticalPadding}px` }"
      @click="setSongTime(getPreviewLineTime())"
      title="点击跳转播放"
    >
      <Play theme="outline" size="20" />
      <span>{{ formatTime(getPreviewLineTime()) }}</span>
    </div>
  </div>
</template>
<style scoped>
.song-detail-lyric {
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
  line-height: var(--lyric-line-height);
  mask-image: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.6) 8%,
    rgba(255, 255, 255, 1) 15%,
    rgba(255, 255, 255, 1) 85%,
    rgba(255, 255, 255, 0.6) 91%,
    rgba(255, 255, 255, 0) 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.6) 8%,
    rgba(255, 255, 255, 1) 15%,
    rgba(255, 255, 255, 1) 85%,
    rgba(255, 255, 255, 0.6) 91%,
    rgba(255, 255, 255, 0) 100%
  );
}

.song-detail-lyric-scroll {
  overflow: auto;
  height: 100%;
}
.song-detail-lyric-scroll::-webkit-scrollbar {
  display: none;
}

/* .song-detail-lyric-content::after,
.song-detail-lyric-content::before {
  content: " ";
  display: block;
  height: 40vh;
  height: 40dvh;
} */
/* .song-detail-lyric-content { */
/* margin: 40vh 0; */
/* margin: 40dvh 0; */
/* } */

.song-detail-lyric-content > div {
  transition: font-size 0.3s ease-in-out;
  height: var(--lyric-line-height);
  font-size: 16px;
  cursor: pointer;
}
.song-detail-lyric-content .lyric {
  height: var(--lyric-line-height);
  font-size: 20px;
}
.song-detail-lyric-content .lyric span {
  background-color: var(--color-border);
}
.quickly-play-line {
  position: absolute;
  /* top: 50%; */
  transform: translateX(-50%);
  left: 50%;
  width: 100%;
  max-width: 90vmin;
  display: flex;
  align-items: center;
  /* justify-content: flex-start; */
  gap: 8px;
  color: var(--color-border);
  cursor: pointer;
  opacity: 0.5;
}
.quickly-play-line::after {
  content: "";
  display: block;
  height: 1px;
  background-color: var(--color-border);
  flex: 1;
  min-width: 0;
}
</style>
