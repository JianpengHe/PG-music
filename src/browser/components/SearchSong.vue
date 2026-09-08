<script setup lang="ts">
import { ref, watch } from "vue";
import { Search, CloseOne } from "@icon-park/vue-next";
export type SearchProps = {
  placeholder?: string;
  getSmartTips?: (value: string) => Promise<string[]>;
};
export type SearchEmits = {
  (e: "submit", value: string): void;
};
const { placeholder, getSmartTips } = defineProps<SearchProps>();
const emit = defineEmits<SearchEmits>();

const inputRef = ref<HTMLInputElement>();
const searchValue = ref("");

const isFocused = ref(false);
const smartTips = ref<string[]>([]);
const debounce = debouncedFn(async () => {
  smartTips.value = (await getSmartTips?.(searchValue.value)) || [];
}, 500);
watch(searchValue, debounce);

function submit() {
  inputRef.value?.blur();
  emit("submit", searchValue.value);
}
function reset() {
  searchValue.value = "";
  inputRef.value?.focus();
}

function selectItem(item: string) {
  console.log("选择：", item);
  searchValue.value = item;
  smartTips.value = [];
  submit();
}

function debouncedFn(callback: () => Promise<void>, minDelay = 500) {
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
</script>
<template>
  <form @submit.prevent="submit" @reset.prevent="reset">
    <div class="search-box">
      <button type="submit"><Search /></button>
      <input
        autofocus
        autocomplete="off"
        ref="inputRef"
        type="text"
        name="search"
        v-model="searchValue"
        @focus="isFocused = true"
        @blur="isFocused = false"
        :placeholder="placeholder || '请输入搜索内容'"
      />
      <button v-show="!!searchValue" type="reset"><CloseOne theme="filled" /></button>
    </div>
    <div v-show="isFocused && searchValue" class="smart-tips">
      <div v-for="item in smartTips" :key="item" @mousedown="selectItem(item)" @touchstart="selectItem(item)">
        {{ item }}
      </div>
    </div>
  </form>
</template>
<style scoped>
form {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 32px;
  padding: 8px;
  background-color: var(--color-bg-secondary);
  font-size: 14px;
}

.search-box {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  background-color: var(--color-surface);
  z-index: 9999;
  position: relative;
}

button {
  border: none;
  outline: none;
  height: 32px;
  background-color: transparent;
  padding: 0;
}

input {
  flex: 1;
  border: none;
  outline: none;
  height: 32px;
  background-color: transparent;
  color: var(--color-text-primary);
}

.i-icon {
  padding: 8px;
  width: 16px;
  height: 16px;
}

.i-icon-search {
  padding-right: 2px;
}

.smart-tips {
  box-shadow: 0 0 12px 1px var(--color-shadow);
  backdrop-filter: blur(24px);
}

.smart-tips > div {
  border-top: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 8px;
  line-height: 24px;
  cursor: pointer;
  background-color: var(--color-overlay);
  color: var(--color-text-primary);
}
</style>
