// 艾宾浩斯记忆遗忘曲线算法

// 记忆状态枚举
export const MEMORY_STATE = {
  KNOWN: 'known', // 认识
  FUZZY: 'fuzzy', // 模糊
  UNKNOWN: 'unknown', // 不认识
};

// 艾宾浩斯复习间隔（天）
// 根据记忆状态和复习次数确定下次复习时间
const REVIEW_INTERVALS = {
  [MEMORY_STATE.KNOWN]: [1, 3, 7, 15, 30, 60], // 认识：1天、3天、7天、15天、30天、60天
  [MEMORY_STATE.FUZZY]: [0.5, 1, 3, 7, 15, 30], // 模糊：0.5天、1天、3天、7天、15天、30天
  [MEMORY_STATE.UNKNOWN]: [0, 0.5, 1, 3, 7, 15], // 不认识：立即、0.5天、1天、3天、7天、15天
};

// 获取单词的记忆记录
export function getWordMemory(word, category) {
  const key = `memory_${word}_${category}`;
  const memoryStr = localStorage.getItem(key);
  return memoryStr ? JSON.parse(memoryStr) : null;
}

// 保存单词的记忆记录
export function saveWordMemory(word, category, memoryData) {
  const key = `memory_${word}_${category}`;
  localStorage.setItem(key, JSON.stringify(memoryData));
}

// 记录单词记忆状态
export function recordMemoryState(word, category, state) {
  const now = new Date();
  const memory = getWordMemory(word, category);

  let reviewCount = 0;
  let lastReviewDate = null;
  let firstStudyDate = now.toISOString();

  if (memory) {
    reviewCount = memory.reviewCount || 0;
    lastReviewDate = memory.lastReviewDate;
    firstStudyDate = memory.firstStudyDate || firstStudyDate;
  }

  // 增加复习次数
  reviewCount++;

  // 计算下次复习时间
  const intervals = REVIEW_INTERVALS[state];
  const intervalIndex = Math.min(reviewCount - 1, intervals.length - 1);
  const intervalDays = intervals[intervalIndex];

  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  const memoryData = {
    word: word,
    category: category,
    state: state,
    reviewCount: reviewCount,
    lastReviewDate: now.toISOString(),
    nextReviewDate: nextReviewDate.toISOString(),
    firstStudyDate: firstStudyDate,
    history: memory
      ? (memory.history || []).concat([
          {
            state: state,
            date: now.toISOString(),
          },
        ])
      : [
          {
            state: state,
            date: now.toISOString(),
          },
        ],
  };

  saveWordMemory(word, category, memoryData);
  return memoryData;
}

// 检查单词是否需要复习
export function needsReview(word, category) {
  const memory = getWordMemory(word, category);
  if (!memory) {
    return true; // 未学习过的单词需要学习
  }

  const now = new Date();
  const nextReview = new Date(memory.nextReviewDate);

  // 如果下次复习时间已到或已过，需要复习
  return now >= nextReview;
}

// 计算单词的复习优先级
// 返回值越大，优先级越高（越需要复习）
export function getReviewPriority(word, category) {
  const memory = getWordMemory(word, category);

  if (!memory) {
    return 1000; // 未学习过的单词优先级最高
  }

  const now = new Date();
  const nextReview = new Date(memory.nextReviewDate);
  const timeDiff = now - nextReview; // 毫秒

  // 如果已经超过复习时间，计算超时时间（小时）
  const overdueHours = timeDiff > 0 ? timeDiff / (1000 * 60 * 60) : 0;

  // 根据记忆状态和超时时间计算优先级
  let basePriority = 0;

  switch (memory.state) {
    case MEMORY_STATE.UNKNOWN:
      basePriority = 500; // 不认识的单词优先级高
      break;
    case MEMORY_STATE.FUZZY:
      basePriority = 300; // 模糊的单词优先级中等
      break;
    case MEMORY_STATE.KNOWN:
      basePriority = 100; // 认识的单词优先级较低
      break;
  }

  // 超时时间越长，优先级越高
  const priority = basePriority + overdueHours * 10;

  return priority;
}

// 获取所有需要复习的单词
export function getWordsToReview(wordList, category) {
  return wordList.filter((word) => {
    return needsReview(word.word, category);
  });
}

// 对单词列表按复习优先级排序
export function sortWordsByPriority(wordList, category) {
  return wordList.slice().sort((a, b) => {
    const priorityA = getReviewPriority(a.word, category);
    const priorityB = getReviewPriority(b.word, category);
    return priorityB - priorityA; // 降序排列
  });
}

// 获取单词的记忆状态描述
export function getMemoryStateDescription(word, category) {
  const memory = getWordMemory(word, category);
  if (!memory) {
    return '未学习';
  }

  const stateNames = {
    [MEMORY_STATE.KNOWN]: '已掌握',
    [MEMORY_STATE.FUZZY]: '模糊',
    [MEMORY_STATE.UNKNOWN]: '不熟悉',
  };

  const now = new Date();
  const nextReview = new Date(memory.nextReviewDate);
  const timeDiff = nextReview - now;

  if (timeDiff <= 0) {
    return `${stateNames[memory.state]} (需复习)`;
  }

  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return `${stateNames[memory.state]} (${days}天后复习)`;
}

// 获取单词的复习统计
export function getWordReviewStats(word, category) {
  const memory = getWordMemory(word, category);
  if (!memory) {
    return {
      reviewCount: 0,
      state: '未学习',
      nextReviewDate: null,
    };
  }

  const stateNames = {
    [MEMORY_STATE.KNOWN]: '已掌握',
    [MEMORY_STATE.FUZZY]: '模糊',
    [MEMORY_STATE.UNKNOWN]: '不熟悉',
  };

  return {
    reviewCount: memory.reviewCount || 0,
    state: stateNames[memory.state] || '未知',
    nextReviewDate: memory.nextReviewDate,
    lastReviewDate: memory.lastReviewDate,
    firstStudyDate: memory.firstStudyDate,
  };
}

// 安排复习
export function scheduleReview(wordKey, status, timestamp) {
  recordMemoryState(wordKey.split('-')[1], wordKey.split('-')[0], status);
}
