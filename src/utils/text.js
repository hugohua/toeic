/**
 * 文本处理工具函数
 */

/**
 * 从句子中提取英文部分（括号前的部分）
 * @param {string} text - 原始文本
 * @returns {{english: string, remaining: string}} 英文部分和剩余部分
 */
export function extractEnglishText(text) {
  if (!text) return { english: '', remaining: '' };
  const match = text.match(/^([^(（]+)([（(].*)?$/);
  if (match) {
    return {
      english: match[1].trim(),
      remaining: match[2] || '',
    };
  }
  return { english: text, remaining: '' };
}

/**
 * 格式化文章内容（处理加粗标记并添加点击事件）
 * @param {string} content - 文章内容
 * @returns {string} 格式化后的HTML字符串
 */
export function formatArticle(content) {
  if (!content) return '';
  
  // 将 **word** 转换为可点击的 <strong>word</strong>
  let formatted = content.replace(/\*\*(.*?)\*\*/g, (match, wordText) => {
    return `<strong class="word-highlight" data-word="${wordText.trim()}">${wordText}</strong>`;
  });
  
  // 将换行符转换为 <br>
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

/**
 * 提取文章标题
 * @param {string} content - 文章内容
 * @returns {string} 标题
 */
export function extractTitle(content) {
  if (!content) return '';
  
  // 优先提取 "Title: xxx" 格式的标题
  const titleMatch = content.match(/Title:\s*([^\n]+)/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  
  // 如果没有找到 Title: 格式，移除markdown加粗标记，然后取第一句话
  const cleanContent = content.replace(/\*\*/g, '').trim();
  // 找到第一个句子结束符（句号、问号、感叹号）
  const match = cleanContent.match(/^([^。！？\n]+[。！？]?)/);
  if (match) {
    return match[1].trim();
  }
  // 如果没有标点，取前50个字符
  return cleanContent.substring(0, 50).trim();
}

/**
 * 清理单词文本（移除可能的标点符号）
 * @param {string} wordText - 原始单词文本
 * @returns {string} 清理后的单词
 */
export function cleanWordText(wordText) {
  if (!wordText) return '';
  return wordText.trim().toLowerCase().replace(/[.,!?;:()\[\]{}'"]/g, '');
}

/**
 * 将关键搭配数组转换为HTML字符串
 * @param {Array|string} keyCollocations - 关键搭配数组或字符串
 * @returns {string} HTML字符串
 */
export function formatKeyCollocations(keyCollocations) {
  if (keyCollocations && Array.isArray(keyCollocations)) {
    return '<ul>' + keyCollocations.map((coll) => `<li>${coll}</li>`).join('') + '</ul>';
  } else if (typeof keyCollocations === 'string') {
    return keyCollocations;
  }
  return '暂无';
}

