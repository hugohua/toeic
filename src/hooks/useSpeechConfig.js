import { useAliyunAudio } from './useAliyunAudio';

/**
 * 语音合成 Hook (兼容层)
 * 将原来使用 react-text-to-speech 的调用转发到新的阿里云 TTS Hook
 * 
 * @param {string} text - 要朗读的文本
 * @returns {object} { start, stop, speechStatus }
 */
export function useSpeechConfig(text) {
    const { play, stop, playing } = useAliyunAudio();

    const start = () => {
        // 使用默认音色 Elias，自动检测语言，正常语速
        play(text);
    };

    return {
        start,
        stop,
        speechStatus: playing ? 'started' : 'stopped',
        isInSpeech: playing, // 部分组件可能使用这个字段
    };
}
