import CryptoJS from 'crypto-js';

/**
 * 生成音频文件哈希
 * 用于音频缓存的唯一标识
 * 规则：text_voice_language_playbackRate (默认1.0)
 * 
 * @param {string} text - 文本内容
 * @param {string} voice - 音色
 * @param {string} language - 语言
 * @returns {string} - 完整 MD5 哈希
 */
export function generateAudioHash(text, voice, language) {
    const content = `${text}_${voice}_${language}_1.0`;
    return CryptoJS.MD5(content).toString();
}
