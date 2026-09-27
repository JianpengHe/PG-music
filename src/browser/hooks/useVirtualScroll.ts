import { Ref, onUnmounted, ref } from "vue";

/**
 * 虚拟滚动列表中实际用于渲染的列表项。
 *
 * @template T 原始列表数据类型
 */
export type VirtualScrollItem<T extends { id: string | number }> = {
  /** 用于 Vue v-for 的稳定 key */
  key: string;

  /** 当前数据在完整列表中的索引 */
  index: number;

  /** 当前列表项相对于完整列表顶部的位置 */
  top: number;

  /** 原始数据；超出原始列表范围时为 undefined */
  data: T | undefined;
};

/**
 * 虚拟滚动 Hook。
 *
 * 只维护当前可视区域附近需要渲染的列表项，
 * 避免一次性渲染整个超长列表导致 DOM 数量过多。
 *
 * @param rawList 完整的原始数据列表
 * @param domRef 可滚动容器的 DOM Ref
 * @param height 单个列表项的固定高度
 */
export function useVirtualScroll<T extends { id: string | number }>(
  rawList: Ref<T[]>,
  domRef: Ref<HTMLDivElement | undefined, HTMLDivElement | undefined>,
  height: number,
) {
  /**
   * 当前实际需要渲染的虚拟列表。
   *
   * 注意：
   * 这里不是完整的 rawList，而是根据当前滚动位置计算出来的
   * 可视区域 + 上下缓冲区域的数据。
   */
  const filterList = ref<VirtualScrollItem<T>[]>([]);

  /** 当前正在等待执行的 requestAnimationFrame ID */
  let rafId: number | null = null;

  /** 完整列表对应的虚拟容器高度 */
  let parentHeight = 0;

  /**
   * 请求重新计算虚拟列表。
   *
   * 使用 requestAnimationFrame 将连续触发的计算合并到下一帧，
   * 避免 scroll 等高频事件触发时重复执行 calc。
   */
  const render = () => {
    // 当前已经有一个 RAF 等待执行，不需要重复创建
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;

      // 在浏览器下一帧执行实际的列表计算
      calc();
    });
  };

  /**
   * 根据当前滚动位置计算需要渲染的列表项。
   */
  const calc = () => {
    const dom = domRef.value;

    // DOM 尚未挂载时无法获取滚动位置
    if (!dom) return console.error("domRef.value is undefined");

    // console.log("calc");

    /**
     * 计算完整虚拟列表的高度。
     *
     * 虽然实际 DOM 只渲染部分列表项，
     * 但外层容器仍然需要保持完整列表应有的高度，
     * 从而让浏览器产生正确的滚动条范围。
     */
    parentHeight = rawList.value.length * height;

    /** 当前滚动容器的可视区域高度 */
    const visibleHeight = dom.clientHeight;

    /**
     * 实际渲染区域高度。
     *
     * 这里设置为可视区域的 2 倍，
     * 即除了当前可视区域外，还额外渲染上下缓冲区域，
     * 避免快速滚动时因为 DOM 更新不及时出现空白。
     */
    const renderHeight = visibleHeight * 2;

    /**
     * 根据渲染区域高度计算最多需要渲染多少个列表项。
     */
    const maxItemCount = Math.round(renderHeight / height);

    /** 隐藏顶部项数量 */
    // const hiddenTopItemCount = dom.scrollTop / height;

    /**
     * 计算当前渲染区域的起始索引。
     *
     * renderHeight 比 visibleHeight 多出来的部分平均分配到上下两侧，
     * 因此这里需要在当前 scrollTop 的基础上向上额外偏移一半缓冲区域。
     */
    const startIndex = Math.round((dom.scrollTop - (renderHeight - visibleHeight) / 2) / height);

    /**
     * 当前这一轮计算得到的虚拟列表。
     *
     * key -> VirtualScrollItem
     *
     * 使用 Map 可以方便后续根据 key 快速复用旧列表中的 DOM 对应关系。
     */
    const curFilterListMap: Map<string, VirtualScrollItem<T>> = new Map();

    /**
     * 当计算出来的 index 超出 rawList 范围时，
     * data 会变成 undefined。
     *
     * 这里使用递增的 None_xxx 作为临时 key，
     * 保证这些占位项之间的 key 不重复。
     */
    let noneCount = 0;

    /**
     * 构造当前需要渲染的列表项。
     *
     * 即使 index 小于 0 或超过 rawList.length，
     * 也会保留对应的位置，从而让虚拟列表的 DOM 数量保持稳定。
     */
    for (let index = startIndex; index < startIndex + maxItemCount; index++) {
      const data = rawList.value[index];

      /**
       * 正常数据使用数据本身的 id 作为 key。
       * 超出列表范围的项使用 None_xxx 作为占位 key。
       */
      const key = data ? String(data.id) : "None_" + noneCount++;

      curFilterListMap.set(key, {
        key,
        index,

        /**
         * 正常数据按照 index * height 定位。
         *
         * 如果 data 不存在，说明该位置已经超出了 rawList，
         * 此时将 top 设置为 -height，使占位项不会出现在实际位置。
         */
        top: data ? index * height : -height,

        data,
      });
    }

    /** 上一次实际渲染的虚拟列表 */
    const oldFilterList = filterList.value;

    /**
     * 将旧列表的 key 转换成 Set，
     * 用于快速判断当前项是否已经存在于旧列表中。
     */
    const oldFilterListSet = new Set(oldFilterList.map(item => item.key));

    /**
     * 找出这一轮计算中新出现、但旧列表中不存在的 key。
     *
     * 后面会优先使用这些 key 填充旧列表中空出来的位置，
     * 尽量复用原有数组结构。
     */
    const newFilterKeyNoInOldList = [...curFilterListMap.keys()].filter(key => !oldFilterListSet.has(key));

    /**
     * 根据旧列表生成新列表。
     *
     * 如果当前需要渲染的数量比旧列表更多，
     * 先补充空对象作为占位，保证后续 map 时有足够的位置。
     */
    const newFilterList = [
      ...oldFilterList,
      ...(maxItemCount > oldFilterList.length ? Array(maxItemCount - oldFilterList.length).fill({}) : []),
    ]
      .map(({ key }) => {
        /**
         * 优先根据旧 key 获取当前列表中的对应项。
         *
         * 如果旧 key 已经不在当前可视范围，
         * 则从新出现的 key 中取一个替换当前的位置。
         */
        const item =
          curFilterListMap.get(key) ?? ((key = newFilterKeyNoInOldList.pop()) ? curFilterListMap.get(key) : undefined);

        /**
         * 当前项已经被放入新列表，因此从 Map 中删除，
         * 最终 Map 中剩余的就是还没有被消费的项。
         */
        if (item?.key) curFilterListMap.delete(item.key);

        return item;
      })

      /** 移除 undefined 项 */
      .filter(Boolean)

      /** 限制最终渲染数量 */
      .slice(0, maxItemCount) as VirtualScrollItem<T>[];

    /**
     * 如果新旧列表的 key 完全一致，
     * 说明虽然触发了计算，但实际渲染内容没有发生变化，
     * 因此不需要触发 Vue 响应式更新。
     */
    if (oldFilterList.map(item => item.key).join(",") === newFilterList.map(item => item.key).join(",")) return;

    /** 更新当前实际需要渲染的列表 */
    filterList.value = newFilterList;
  };

  // watch(rawList, render);

  /**
   * 组件卸载时取消尚未执行的 requestAnimationFrame，
   * 避免组件销毁后 RAF 回调仍然执行。
   */
  onUnmounted(() => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    // domRef.value?.removeEventListener("scroll", render);
  });

  return { render, filterList };
}
