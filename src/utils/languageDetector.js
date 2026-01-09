/**
 * 语言检测工具
 * 自动检测文本语言类型
 */

/**
 * 检测文本主要语言
 * @param {string} text - 要检测的文本
 * @returns {string} - 语言类型: Chinese, English, Japanese, Korean 等
 */
export function detectLanguage(text) {
    if (!text || !text.trim()) {
        return 'Chinese'; // 默认中文
    }

    // 统计各种字符数量
    let chineseCount = 0;
    let englishCount = 0;
    let japaneseCount = 0;
    let koreanCount = 0;

    for (let char of text) {
        const code = char.charCodeAt(0);

        // 中文字符 (包括常用汉字)
        if ((code >= 0x4E00 && code <= 0x9FFF) ||
            (code >= 0x3400 && code <= 0x4DBF)) {
            chineseCount++;
        }
        // 英文字符
        else if ((code >= 0x0041 && code <= 0x005A) ||
            (code >= 0x0061 && code <= 0x007A)) {
            englishCount++;
        }
        // 日文假名
        else if ((code >= 0x3040 && code <= 0x309F) || // 平假名
            (code >= 0x30A0 && code <= 0x30FF)) { // 片假名
            japaneseCount++;
        }
        // 韩文
        else if (code >= 0xAC00 && code <= 0xD7AF) {
            koreanCount++;
        }
    }

    // 计算总字符数
    const total = chineseCount + englishCount + japaneseCount + koreanCount;

    if (total === 0) {
        return 'Chinese'; // 默认中文
    }

    // 计算各语言占比
    const chineseRatio = chineseCount / total;
    const englishRatio = englishCount / total;
    const japaneseRatio = japaneseCount / total;
    const koreanRatio = koreanCount / total;

    // 返回占比最高的语言
    const maxRatio = Math.max(chineseRatio, englishRatio, japaneseRatio, koreanRatio);

    if (maxRatio === chineseRatio) return 'Chinese';
    if (maxRatio === englishRatio) return 'English';
    if (maxRatio === japaneseRatio) return 'Japanese';
    if (maxRatio === koreanRatio) return 'Korean';

    return 'English'; // 默认中文
}

/**
 * 检测是否为混合语言
 * @param {string} text - 要检测的文本
 * @returns {boolean} - 是否为混合语言
 */
export function isMixedLanguage(text) {
    const language = detectLanguage(text);

    let otherLanguageCount = 0;
    for (let char of text) {
        const code = char.charCodeAt(0);

        if (language === 'Chinese') {
            // 检查是否有大量英文
            if ((code >= 0x0041 && code <= 0x005A) ||
                (code >= 0x0061 && code <= 0x007A)) {
                otherLanguageCount++;
            }
        } else if (language === 'English') {
            // 检查是否有大量中文
            if ((code >= 0x4E00 && code <= 0x9FFF)) {
                otherLanguageCount++;
            }
        }
    }

    // 如果其他语言字符超过20%，认为是混合语言
    return otherLanguageCount / text.length > 0.2;
}

/**
 * 获取推荐的语音合成语言类型
 * @param {string} text - 文本内容
 * @returns {string} - 推荐的语言类型
 */
export function getRecommendedLanguage(text) {
    if (isMixedLanguage(text)) {
        return 'Auto'; // 混合语言使用自动检测
    }
    return detectLanguage(text);
}
