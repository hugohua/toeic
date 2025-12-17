// 学习数据存储管理

// 获取今天的日期字符串（YYYY-MM-DD）
export function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// 获取或初始化今天的学习数据
export function getTodayData() {
  const today = getTodayDate();
  const dataStr = localStorage.getItem('learningData');
  let allData = dataStr ? JSON.parse(dataStr) : {};

  if (!allData[today]) {
    allData[today] = {
      date: today,
      wordCount: 0,
      studyTime: 0, // 学习时长（秒）
      startTime: null, // 开始学习的时间戳
      words: [], // 学习的单词列表
    };
  }

  return allData[today];
}

// 保存今天的学习数据
export function saveTodayData(data) {
  const today = getTodayDate();
  const dataStr = localStorage.getItem('learningData');
  let allData = dataStr ? JSON.parse(dataStr) : {};
  allData[today] = data;
  localStorage.setItem('learningData', JSON.stringify(allData));
}

// 开始学习（记录开始时间）
export function startStudy() {
  const todayData = getTodayData();
  // 如果已经有开始时间且距离现在不超过5分钟，说明是连续学习，不重新计时
  if (todayData.startTime) {
    const timeDiff = Date.now() - todayData.startTime;
    // 如果间隔超过5分钟，认为是一次新的学习 session
    if (timeDiff > 5 * 60 * 1000) {
      // 保存之前的学习时间
      const duration = Math.floor(timeDiff / 1000);
      todayData.studyTime += duration;
      // 重新开始计时
      todayData.startTime = Date.now();
      saveTodayData(todayData);
    }
  } else {
    // 没有开始时间，开始新的学习 session
    todayData.startTime = Date.now();
    saveTodayData(todayData);
  }
}

// 结束学习（计算学习时长）
export function endStudy() {
  const todayData = getTodayData();
  if (todayData.startTime) {
    const endTime = Date.now();
    const duration = Math.floor((endTime - todayData.startTime) / 1000); // 转换为秒
    todayData.studyTime += duration;
    todayData.startTime = null;
    saveTodayData(todayData);
  }
}

// 记录学习的单词
export function recordWord(word, category, isKnown) {
  const todayData = getTodayData();

  // 检查单词是否已经记录过
  const existingWord = todayData.words.find(
    (w) => w.word === word && w.category === category
  );

  if (existingWord) {
    // 更新记忆情况
    existingWord.isKnown = isKnown;
    existingWord.lastStudyTime = new Date().toISOString();
  } else {
    // 新增单词记录
    todayData.words.push({
      word: word,
      category: category,
      isKnown: isKnown,
      studyTime: new Date().toISOString(),
      lastStudyTime: new Date().toISOString(),
    });
    todayData.wordCount = todayData.words.length;
  }

  saveTodayData(todayData);
}

// 获取所有历史数据
export function getAllData() {
  const dataStr = localStorage.getItem('learningData');
  return dataStr ? JSON.parse(dataStr) : {};
}

// 获取最近N天的数据
export function getRecentDaysData(days = 7) {
  const allData = getAllData();
  const dates = Object.keys(allData).sort().reverse();
  return dates.slice(0, days).map((date) => ({
    date: date,
    ...allData[date],
  }));
}

// 获取总学习统计
export function getTotalStats() {
  const allData = getAllData();
  let totalWords = 0;
  let totalTime = 0;
  const allWords = new Set();

  Object.values(allData).forEach((dayData) => {
    totalWords += dayData.wordCount || 0;
    totalTime += dayData.studyTime || 0;
    dayData.words?.forEach((w) => {
      allWords.add(`${w.word}_${w.category}`);
    });
  });

  return {
    totalDays: Object.keys(allData).length,
    totalWords: allWords.size,
    totalTime: totalTime,
    totalStudySessions: Object.values(allData).filter((d) => d.wordCount > 0)
      .length,
  };
}

// 清除今天的数据
export function clearTodayData() {
  const today = getTodayDate();
  const dataStr = localStorage.getItem('learningData');
  let allData = dataStr ? JSON.parse(dataStr) : {};
  delete allData[today];
  localStorage.setItem('learningData', JSON.stringify(allData));
}

// 清除所有数据
export function clearAllData() {
  localStorage.removeItem('learningData');
}

// 保存单词状态
export function saveWordStatus(wordKey, status, timestamp) {
  const statusData = {
    status,
    timestamp,
    wordKey,
  };
  localStorage.setItem(`word_${wordKey}`, JSON.stringify(statusData));
}

// ================= 收藏单词相关 =================

const FAVORITE_WORDS_KEY = 'favoriteWords';

// 获取所有收藏的单词（数组：{ word, category }）
export function getFavoriteWords() {
  try {
    const dataStr = localStorage.getItem(FAVORITE_WORDS_KEY);
    if (!dataStr) return [];
    const list = JSON.parse(dataStr);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (item) => item && typeof item.word === 'string' && item.category
    );
  } catch (e) {
    console.error('读取收藏单词失败', e);
    return [];
  }
}

// 判断某个单词是否已被收藏
export function isFavoriteWord(word, category) {
  const list = getFavoriteWords();
  return list.some(
    (item) => item.word === word && item.category === category
  );
}

// 切换收藏状态，返回最新是否已收藏
export function toggleFavoriteWord(word, category) {
  if (!word || !category) return false;
  const list = getFavoriteWords();
  const index = list.findIndex(
    (item) => item.word === word && item.category === category
  );

  if (index !== -1) {
    // 取消收藏
    list.splice(index, 1);
  } else {
    // 新增收藏，放到最前面
    list.unshift({
      word,
      category,
      createdAt: new Date().toISOString(),
    });
  }

  try {
    localStorage.setItem(FAVORITE_WORDS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('保存收藏单词失败', e);
  }

  return index === -1;
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
