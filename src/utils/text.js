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
 * @param {Array} notes - 笔记列表（可选），用于高亮显示笔记关键字
 * @returns {string} 格式化后的HTML字符串
 */
export function formatArticle(content, notes = []) {
  if (!content) return '';
  
  let formatted = content;
  
  // 先将 **word** 转换为可点击的 <strong>word</strong>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, (match, wordText) => {
    const trimmedWord = wordText.trim();
    return `<strong class="word-highlight" data-word="${trimmedWord}">${trimmedWord}</strong>`;
  });
  
  // 将换行符转换为 <br>
  formatted = formatted.replace(/\n/g, '<br>');
  
  // 然后处理笔记高亮（在 HTML 中匹配，去除 HTML 标签后匹配纯文本）
  if (notes && Array.isArray(notes) && notes.length > 0) {
    formatted = highlightNotesInHtml(formatted, notes);
  }
  
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

/**
 * 转义正则表达式特殊字符
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 在 HTML 内容中高亮笔记关键字
 * 通过去除 HTML 标签后在纯文本中匹配，然后使用 DOM API 精确替换
 * @param {string} htmlContent - HTML 内容
 * @param {Array} notes - 笔记列表，每个笔记包含 {id, title, content, type}
 * @returns {string} 高亮后的HTML字符串
 */
function highlightNotesInHtml(htmlContent, notes) {
  if (!htmlContent || !notes || !Array.isArray(notes) || notes.length === 0) {
    return htmlContent || '';
  }

  // 如果内容中没有 HTML 标签，直接使用简单的文本匹配
  if (!htmlContent.includes('<')) {
    return highlightNotesInPlainText(htmlContent, notes);
  }

  // 在浏览器环境中使用 DOM API 进行精确处理
  if (typeof document !== 'undefined') {
    return highlightNotesInHtmlWithDOM(htmlContent, notes);
  } else {
    // Node.js 环境：使用正则表达式（降级方案）
    return highlightNotesInHtmlWithRegex(htmlContent, notes);
  }
}

/**
 * 使用 DOM API 在 HTML 中高亮笔记（浏览器环境）
 */
function highlightNotesInHtmlWithDOM(htmlContent, notes) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // 获取纯文本用于匹配
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  // 按标题长度降序排序
  const sortedNotes = [...notes].sort((a, b) => {
    const lenA = (a.title || '').length;
    const lenB = (b.title || '').length;
    return lenB - lenA;
  });

  // 按标题分组笔记
  const notesByTitle = new Map();
  sortedNotes.forEach(note => {
    const title = (note.title || '').trim();
    if (title) {
      const key = title.toLowerCase();
      if (!notesByTitle.has(key)) {
        notesByTitle.set(key, []);
      }
      notesByTitle.get(key).push(note);
    }
  });

  // 找到所有匹配位置（在纯文本中）
  const allMatches = [];
  const processedRanges = [];

  notesByTitle.forEach((noteGroup) => {
    const title = noteGroup[0].title.trim();
    const noteIds = noteGroup.map(n => n.id).join(',');
    const noteCount = noteGroup.length;

    const isPhrase = /\s/.test(title) || title.length > 20;
    
    let regex;
    if (isPhrase) {
      const escapedTitle = escapeRegex(title);
      regex = new RegExp(`(${escapedTitle})`, 'gi');
    } else {
      const escapedTitle = escapeRegex(title);
      regex = new RegExp(`\\b(${escapedTitle})\\b`, 'gi');
    }

    let match;
    while ((match = regex.exec(plainText)) !== null) {
      const textStart = match.index;
      const textEnd = textStart + match[0].length;
      
      const overlaps = processedRanges.some(range => 
        (textStart >= range.start && textStart < range.end) ||
        (textEnd > range.start && textEnd <= range.end) ||
        (textStart <= range.start && textEnd >= range.end)
      );

      if (!overlaps) {
        allMatches.push({
          textStart,
          textEnd,
          noteIds,
          noteCount,
          text: match[1]
        });
        processedRanges.push({ start: textStart, end: textEnd });
      }
    }
  });

  // 按位置从后往前排序
  allMatches.sort((a, b) => b.textStart - a.textStart);

  // 在 DOM 中查找并高亮文本
  for (const match of allMatches) {
    highlightTextInNode(tempDiv, match);
  }

  return tempDiv.innerHTML;
}

/**
 * 在 DOM 节点中查找并高亮文本（支持跨节点匹配）
 * 使用 Range API 进行精确匹配和替换
 */
function highlightTextInNode(rootNode, match) {
  let textOffset = 0;
  const textNodes = [];

  // 收集所有文本节点及其位置（包括 word-highlight 内部的）
  function collectTextNodes(currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const text = currentNode.textContent;
      textNodes.push({
        node: currentNode,
        start: textOffset,
        end: textOffset + text.length
      });
      textOffset += text.length;
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      // 跳过已经是 note-highlight 的元素（避免重复高亮）
      if (currentNode.classList && 
          currentNode.classList.contains('note-highlight')) {
        const skippedText = currentNode.textContent || '';
        textOffset += skippedText.length;
        return;
      }

      // word-highlight 元素仍然需要遍历子节点，因为我们要匹配跨边界的文本
      const children = Array.from(currentNode.childNodes);
      children.forEach(child => collectTextNodes(child));
    }
  }

  collectTextNodes(rootNode);

  // 找到匹配的文本节点范围
  const matchStart = match.textStart;
  const matchEnd = match.textEnd;
  
  let startNodeInfo = null;
  let endNodeInfo = null;
  
  for (const nodeInfo of textNodes) {
    if (!startNodeInfo && matchStart >= nodeInfo.start && matchStart < nodeInfo.end) {
      startNodeInfo = nodeInfo;
    }
    if (matchEnd > nodeInfo.start && matchEnd <= nodeInfo.end) {
      endNodeInfo = nodeInfo;
      break;
    }
  }

  if (!startNodeInfo || !endNodeInfo) {
    return; // 未找到匹配
  }

  // 创建 Range 来精确选择文本
  const range = document.createRange();
  
  const startOffsetInNode = matchStart - startNodeInfo.start;
  const endOffsetInNode = matchEnd - endNodeInfo.start;
  
  try {
    range.setStart(startNodeInfo.node, startOffsetInNode);
    range.setEnd(endNodeInfo.node, endOffsetInNode);

    // 提取匹配的文本（用于验证）
    const matchedText = range.toString();
    
    // 验证匹配的文本是否与期望的一致（忽略大小写和空白字符）
    const expectedText = match.text.trim().toLowerCase().replace(/\s+/g, ' ');
    const actualText = matchedText.trim().toLowerCase().replace(/\s+/g, ' ');
    
    if (actualText !== expectedText) {
      console.warn('Text mismatch:', { expected: expectedText, actual: actualText, match });
      return; // 不匹配，跳过
    }

    // 检查 Range 是否跨越了已存在的 note-highlight
    const commonAncestor = range.commonAncestorContainer;
    if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
      const existingHighlights = commonAncestor.querySelectorAll('.note-highlight');
      for (const highlight of existingHighlights) {
        if (range.intersectsNode(highlight)) {
          return; // 与已存在的高亮重叠，跳过
        }
      }
    }

    // 创建高亮元素
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'note-highlight';
    highlightSpan.setAttribute('data-note-ids', match.noteIds);
    highlightSpan.setAttribute('data-note-count', match.noteCount);
    
    // 使用 cloneContents 来保持原有的 HTML 结构（包括 strong 标签等）
    const contents = range.cloneContents();
    highlightSpan.appendChild(contents);
    
    if (match.noteCount > 1) {
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'note-badge';
      badgeSpan.textContent = match.noteCount;
      highlightSpan.appendChild(badgeSpan);
    }

    // 使用 Range 替换文本
    range.deleteContents();
    range.insertNode(highlightSpan);
  } catch (e) {
    // 如果 Range API 失败，记录错误但不中断
    console.warn('Range API failed:', e, { match, startNodeInfo, endNodeInfo });
  }
}

/**
 * 使用正则表达式在 HTML 中高亮笔记（Node.js 环境降级方案）
 */
function highlightNotesInHtmlWithRegex(htmlContent, notes) {
  // 简单实现：去除 HTML 标签后匹配，然后尝试在原始 HTML 中替换
  // 这个方案不够精确，但可以在服务端使用
  const plainText = htmlContent.replace(/<[^>]*>/g, '');
  
  // 使用纯文本匹配（简化版）
  return highlightNotesInPlainText(plainText, notes);
}

/**
 * 在纯文本内容中高亮笔记（无 HTML 标签）
 * @param {string} content - 纯文本内容
 * @param {Array} notes - 笔记列表
 * @returns {string} 高亮后的文本
 */
function highlightNotesInPlainText(content, notes) {
  if (!content || !notes || !Array.isArray(notes) || notes.length === 0) {
    return content || '';
  }

  // 按标题长度降序排序
  const sortedNotes = [...notes].sort((a, b) => {
    const lenA = (a.title || '').length;
    const lenB = (b.title || '').length;
    return lenB - lenA;
  });

  const notesByTitle = new Map();
  sortedNotes.forEach(note => {
    const title = (note.title || '').trim();
    if (title) {
      const key = title.toLowerCase();
      if (!notesByTitle.has(key)) {
        notesByTitle.set(key, []);
      }
      notesByTitle.get(key).push(note);
    }
  });

  let result = content;
  const processedRanges = [];

  notesByTitle.forEach((noteGroup) => {
    const title = noteGroup[0].title.trim();
    const noteIds = noteGroup.map(n => n.id).join(',');
    const noteCount = noteGroup.length;

    const isPhrase = /\s/.test(title) || title.length > 20;
    
    let regex;
    if (isPhrase) {
      const escapedTitle = escapeRegex(title);
      regex = new RegExp(`(${escapedTitle})`, 'gi');
    } else {
      const escapedTitle = escapeRegex(title);
      regex = new RegExp(`\\b(${escapedTitle})\\b`, 'gi');
    }

    const matches = [];
    let match;
    while ((match = regex.exec(result)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      const overlaps = processedRanges.some(range => 
        (start >= range.start && start < range.end) ||
        (end > range.start && end <= range.end) ||
        (start <= range.start && end >= range.end)
      );

      if (!overlaps) {
        matches.push({ start, end, text: match[1] });
      }
    }

    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, text } = matches[i];
      const before = result.substring(0, start);
      const after = result.substring(end);
      const badgeHtml = noteCount > 1 
        ? `<span class="note-badge">${noteCount}</span>`
        : '';
      const highlighted = `<span class="note-highlight" data-note-ids="${noteIds}" data-note-count="${noteCount}">${text}${badgeHtml}</span>`;
      
      result = before + highlighted + after;
      processedRanges.push({ start, end });
    }
  });

  return result;
}

