import type { IEventList } from "./types";

/**
 * Typed Event
 */
class TypedWindowEvent<T extends Record<string, any>> {
  /**
   * 触发事件
   */
  emit<K extends keyof T>(type: K, detail: T[K]) {
    return window.dispatchEvent(new CustomEvent(String(type), { detail }));
  }

  /**
   * 监听事件
   */
  on<K extends keyof T>(type: K, listener: (e: CustomEvent<T[K]>) => void) {
    return window.addEventListener(type as any, listener);
  }

  /**
   * 移除事件监听
   */
  off<K extends keyof T>(type: K, listener: (e: CustomEvent<T[K]>) => void) {
    return window.removeEventListener(type as any, listener);
  }
}

export const myEvent = new TypedWindowEvent<IEventList>();
