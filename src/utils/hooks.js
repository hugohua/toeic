/**
 * 自定义 React Hooks
 */
import { useSpeech } from 'react-text-to-speech';

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

