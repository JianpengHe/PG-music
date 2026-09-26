import { Ref, onUnmounted, ref, watch } from "vue";
export type VirtualScrollItem<T> = { key: string; index: number; top: number; data: T | undefined };

export function useVirtualScroll<T extends Record<string, any>>(
  rawList: Ref<T[]>,
  domRef: Ref<HTMLDivElement | undefined, HTMLDivElement | undefined>,
  height: number,
) {
  const filterList = ref<VirtualScrollItem<T>[]>([]);
  let startIndex = -Infinity;
  //   let isBusy = false;
  //   let needNextCall = false;
  let rafId: number | null = null;
  let parentHeight = 0;
  const render = () => {
    if (rafId) {
      //   needNextCall = true;
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      calc();
    });
  };
  const calc = () => {
    const dom = domRef.value;
    if (!dom) return console.error("domRef.value is undefined");
    // console.log("calc");
    const curParentHeight = rawList.value.length * height;
    if (curParentHeight !== parentHeight) {
      //   dom.style.height = `${curParentHeight}px`;
      parentHeight = curParentHeight;
    }
    const visibleHeight = dom.clientHeight;
    const renderHeight = visibleHeight * 3;
    const maxItemCount = Math.round(renderHeight / height);

    /** 隐藏顶部项数量 */
    // const hiddenTopItemCount = dom.scrollTop / height;
    const curStartIndex = Math.round((dom.scrollTop - (renderHeight - visibleHeight) / 2) / height);
    // if (curStartIndex !== startIndex) {
    startIndex = curStartIndex;
    const curFilterListMap: Map<string, VirtualScrollItem<T>> = new Map();
    let noneCount = 0;
    for (let index = startIndex; index < startIndex + maxItemCount; index++) {
      const data = rawList.value[index];
      const key = data ? data.id : "None_" + noneCount++;
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
    // console.log(oldFilterList.map(item => item.key).join(","), newFilterList.map(item => item.key).join(","));
    filterList.value = newFilterList;
    // }

    // console.log(
    //   "clientHeight",
    //   dom.clientHeight,
    //   "scrollTop",
    //   dom.scrollTop,
    //   "startIndex",
    //   startIndex,
    //   "endIndex",
    //   startIndex + renderHeight / height,

    //   "renderHeight",
    //   renderHeight,
    // );
  };
  watch(rawList, render);
  //   onMounted(() => {
  //     console.log(domRef.value);
  //     render();
  //     domRef.value?.addEventListener("scroll", render);
  //   });
  onUnmounted(() => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // domRef.value?.removeEventListener("scroll", render);
  });
  return { render, filterList };
}
