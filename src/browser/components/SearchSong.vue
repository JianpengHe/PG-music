<script setup lang="ts">
import { ref } from "vue";
import { Search, CloseOne } from "@icon-park/vue-next";
export type SearchProps = {
  placeholder?: string;
  smartTips: string[];
};
export type SearchEmits = {
  (e: "submit"): void;
};
const { placeholder, smartTips } = defineProps<SearchProps>();
const kw = defineModel<string>();
const emit = defineEmits<SearchEmits>();

const inputRef = ref<HTMLInputElement>();

const isFocused = ref(false);

function submit() {
  inputRef.value?.blur();

  emit("submit");
}
function reset() {
  kw.value = "";
  inputRef.value?.focus();
}

function selectItem(item: string) {
  console.log("选择：", item);
  kw.value = item;
  setTimeout(submit);
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
        v-model="kw"
        @focus="isFocused = true"
        @blur="isFocused = false"
        :placeholder="placeholder || '请输入搜索内容'"
        @keydown.stop
      />
      <button v-show="!!kw" type="reset"><CloseOne theme="filled" /></button>
    </div>
    <div v-show="isFocused && kw" class="smart-tips">
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
