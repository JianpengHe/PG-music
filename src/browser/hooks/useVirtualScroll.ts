import { Ref, onUnmounted, ref } from "vue";
export type VirtualScrollItem<T extends { id: string | number }> = {
  key: string;
  index: number;
  top: number;
  data: T | undefined;
};

export function useVirtualScroll<T extends { id: string | number }>(
  rawList: Ref<T[]>,
  domRef: Ref<HTMLDivElement | undefined, HTMLDivElement | undefined>,
  height: number,
) {
  const filterList = ref<VirtualScrollItem<T>[]>([]);
  let rafId: number | null = null;
  let parentHeight = 0;
  const render = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      calc();
    });
  };
  const calc = () => {
    const dom = domRef.value;
    if (!dom) return console.error("domRef.value is undefined");
    // console.log("calc");
    parentHeight = rawList.value.length * height;
    const visibleHeight = dom.clientHeight;
    const renderHeight = visibleHeight * 2;
    const maxItemCount = Math.round(renderHeight / height);

    /** 隐藏顶部项数量 */
    // const hiddenTopItemCount = dom.scrollTop / height;
    const startIndex = Math.round((dom.scrollTop - (renderHeight - visibleHeight) / 2) / height);

    const curFilterListMap: Map<string, VirtualScrollItem<T>> = new Map();
    let noneCount = 0;
    for (let index = startIndex; index < startIndex + maxItemCount; index++) {
      const data = rawList.value[index];
      const key = data ? String(data.id) : "None_" + noneCount++;
      curFilterListMap.set(key, {
        key,
        index,
        top: data ? index * height : -height,
        data,
      });
    }
    const oldFilterList = filterList.value;
    const oldFilterListSet = new Set(oldFilterList.map(item => item.key));
    const newFilterKeyNoInOldList = [...curFilterListMap.keys()].filter(key => !oldFilterListSet.has(key));
    const newFilterList = [
      ...oldFilterList,
      ...(maxItemCount > oldFilterList.length ? Array(maxItemCount - oldFilterList.length).fill({}) : []),
    ]
      .map(({ key }) => {
        const item =
          curFilterListMap.get(key) ?? ((key = newFilterKeyNoInOldList.pop()) ? curFilterListMap.get(key) : undefined);
        if (item?.key) curFilterListMap.delete(item.key);
        return item;
      })
      .filter(Boolean)
      .slice(0, maxItemCount) as VirtualScrollItem<T>[];
    if (oldFilterList.map(item => item.key).join(",") === newFilterList.map(item => item.key).join(",")) return;
    filterList.value = newFilterList;
  };
  // watch(rawList, render);
  onUnmounted(() => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // domRef.value?.removeEventListener("scroll", render);
  });
  return { render, filterList };
}
