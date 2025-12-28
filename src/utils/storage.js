// 学习数据存储管理

// 保存单词状态
export function saveWordStatus(wordKey, status, timestamp) {
  const statusData = {
    status,
    timestamp,
    wordKey,
  };
  localStorage.setItem(`word_${wordKey}`, JSON.stringify(statusData));
}

// ================= 单词列表管理（通用系统） =================

/**
 * 单词列表类型配置
 * 新增列表类型时，只需在此配置中添加即可
 */
export const WORD_LIST_TYPES = {
  FAVORITE: 'favorite',
  UNKNOWN: 'unknown',
  FUZZY: 'fuzzy',
};

/**
 * 单词列表类型配置映射
 * key: 列表类型
 * value: { storageKey: localStorage key, errorName: 错误日志中的名称 }
 */
const WORD_LIST_CONFIG = {
  [WORD_LIST_TYPES.FAVORITE]: {
    storageKey: 'favoriteWords',
    errorName: '收藏单词',
  },
  [WORD_LIST_TYPES.UNKNOWN]: {
    storageKey: 'unknownWords',
    errorName: '不认识单词',
  },
  [WORD_LIST_TYPES.FUZZY]: {
    storageKey: 'fuzzyWords',
    errorName: '模糊单词',
  },
};

/**
 * 获取指定类型的单词列表
 * @param {string} listType - 列表类型 (WORD_LIST_TYPES.*)
 * @returns {Array<{word: string, category: string, createdAt?: string}>}
 */
export function getWordList(listType) {
  const config = WORD_LIST_CONFIG[listType];
  if (!config) {
    console.error(`未知的单词列表类型: ${listType}`);
    return [];
  }

  try {
    const dataStr = localStorage.getItem(config.storageKey);
    if (!dataStr) return [];
    const list = JSON.parse(dataStr);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (item) => item && typeof item.word === 'string' && item.category
    );
  } catch (e) {
    console.error(`读取${config.errorName}失败`, e);
    return [];
  }
}

/**
 * 判断某个单词是否在指定列表中
 * @param {string} listType - 列表类型
 * @param {string} word - 单词
 * @param {string} category - 分类
 * @returns {boolean}
 */
export function isWordInList(listType, word, category) {
  const list = getWordList(listType);
  return list.some((item) => item.word === word && item.category === category);
}

/**
 * 添加单词到指定列表
 * @param {string} listType - 列表类型
 * @param {string} word - 单词
 * @param {string} category - 分类
 * @returns {boolean} 是否成功添加
 */
export function addWordToList(listType, word, category) {
  const config = WORD_LIST_CONFIG[listType];
  if (!config) {
    console.error(`未知的单词列表类型: ${listType}`);
    return false;
  }

  if (!word || !category) return false;
  const list = getWordList(listType);
  const index = list.findIndex(
    (item) => item.word === word && item.category === category
  );

  if (index === -1) {
    // 新增单词，放到最前面
    list.unshift({
      word,
      category,
      createdAt: new Date().toISOString(),
    });

    try {
      localStorage.setItem(config.storageKey, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error(`保存${config.errorName}失败`, e);
      return false;
    }
  }

  return false; // 已经存在
}

/**
 * 从指定列表中移除单词
 * @param {string} listType - 列表类型
 * @param {string} word - 单词
 * @param {string} category - 分类
 * @returns {boolean} 是否成功移除
 */
export function removeWordFromList(listType, word, category) {
  const config = WORD_LIST_CONFIG[listType];
  if (!config) {
    console.error(`未知的单词列表类型: ${listType}`);
    return false;
  }

  if (!word || !category) return false;
  const list = getWordList(listType);
  const index = list.findIndex(
    (item) => item.word === word && item.category === category
  );

  if (index !== -1) {
    list.splice(index, 1);
    try {
      localStorage.setItem(config.storageKey, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error(`移除${config.errorName}失败`, e);
      return false;
    }
  }

  return false;
}

/**
 * 切换单词在指定列表中的状态（存在则移除，不存在则添加）
 * @param {string} listType - 列表类型
 * @param {string} word - 单词
 * @param {string} category - 分类
 * @returns {boolean} 操作后是否在列表中
 */
export function toggleWordInList(listType, word, category) {
  const config = WORD_LIST_CONFIG[listType];
  if (!config) {
    console.error(`未知的单词列表类型: ${listType}`);
    return false;
  }

  if (!word || !category) return false;
  const list = getWordList(listType);
  const index = list.findIndex(
    (item) => item.word === word && item.category === category
  );

  if (index !== -1) {
    // 移除
    list.splice(index, 1);
  } else {
    // 添加
    list.unshift({
      word,
      category,
      createdAt: new Date().toISOString(),
    });
  }

  try {
    localStorage.setItem(config.storageKey, JSON.stringify(list));
    return index === -1; // 返回操作后是否在列表中
  } catch (e) {
    console.error(`保存${config.errorName}失败`, e);
    return false;
  }
}


// 获取当前学习组进度
export function getStudyGroupProgress(category) {
  const key = `studyGroup_${category}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// 保存学习组进度
export function saveStudyGroupProgress(category, progress) {
  const key = `studyGroup_${category}`;
  localStorage.setItem(key, JSON.stringify(progress));
}

// 清除学习组进度（完成一组后调用）
export function clearStudyGroupProgress(category) {
  const key = `studyGroup_${category}`;
  localStorage.removeItem(key);
}

// 获取下一个20个单词组
export function getNextStudyGroup(
  category,
  allWords,
  completedWordKeys = new Set()
) {
  // 找出所有未完成的单词
  const uncompletedWords = allWords.filter((word, index) => {
    const wordKey = `${category}-${word.word}`;
    return !completedWordKeys.has(wordKey);
  });

  // 如果所有单词都完成了，返回null
  if (uncompletedWords.length === 0) {
    return null;
  }

  // 返回前20个单词及其在原数组中的索引
  const groupWords = uncompletedWords.slice(0, 20).map((word) => {
    const originalIndex = allWords.findIndex((w) => w.word === word.word);
    return {
      word: word,
      originalIndex: originalIndex,
    };
  });

  return groupWords;
}
