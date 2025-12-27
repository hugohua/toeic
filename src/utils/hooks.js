/**
 * 自定义 React Hooks
 */
import { useSpeech } from 'react-text-to-speech';
import { useEffect } from 'react';
import { disableBodyScroll, enableBodyScroll } from './scroll';

/**
 * 使用默认配置的语音合成 hook
 * @param {string} text - 要朗读的文本
 * @returns {object} useSpeech 的返回值
 */
export function useSpeechConfig(text) {
  return useSpeech({
    text: text || '',
    pitch: 1,
    rate: 1,
    volume: 1,
  });
}

/**
 * 根据条件禁用/启用页面滚动的 hook
 * 适用于浮层打开时禁用背景页面滚动
 * @param {boolean} shouldDisable - 是否禁用滚动
 */
export function useDisableScroll(shouldDisable) {
  useEffect(() => {
    if (shouldDisable) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }

    return () => {
      // 清理函数：确保在组件卸载时恢复滚动
      enableBodyScroll();
    };
  }, [shouldDisable]);
}

