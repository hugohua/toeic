// API 基础 URL
// webpack DefinePlugin 会在构建时注入 process.env.REACT_APP_API_URL
// 开发模式: '/api' (通过 webpack-dev-server 代理到后端 3001 端口)
// 生产模式: 'http://localhost:3000/api'
// 可以通过 window.API_BASE_URL 在运行时覆盖配置
const API_BASE_URL =
  (typeof window !== 'undefined' && window.API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  '/api';

/**
 * 通用 API 请求函数
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API 请求失败: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API 返回错误');
    }

    return data.data;
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  }
}

/**
 * 获取所有分类
 */
export async function getCategories() {
  return apiRequest('/categories');
}

/**
 * 根据分类获取单词列表
 * @param {string} category - 分类名称
 * @param {number} limit - 每页数量（可选）
 * @param {number} offset - 偏移量（可选）
 */
export async function getWordsByCategory(category, limit = null, offset = 0) {
  let endpoint = `/words/${category}`;
  const params = new URLSearchParams();

  if (limit !== null) {
    params.append('limit', limit);
  }
  if (offset > 0) {
    params.append('offset', offset);
  }

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  const result = await apiRequest(endpoint);

  // 转换数据格式以匹配前端期望的格式
  return result.map((word) => ({
    ...word,
    partOfSpeech: word.part_of_speech,
    coreMeaning: word.core_meaning,
    toeicSceneFocus: word.toeic_scene_focus,
    sceneAssociation: word.scene_association,
  }));
}

/**
 * 根据 ID 获取单词详情
 * @param {number} wordId - 单词 ID
 */
export async function getWordById(wordId) {
  const word = await apiRequest(`/word/${wordId}`);

  // 转换数据格式
  return {
    ...word,
    partOfSpeech: word.part_of_speech,
    coreMeaning: word.core_meaning,
    toeicSceneFocus: word.toeic_scene_focus,
    sceneAssociation: word.scene_association,
    keyCollocations: word.keyCollocations || [],
    toeicExampleSentences: word.toeicExampleSentences || [],
    confusingWordsComparison: word.confusingWordsComparison || [],
  };
}

/**
 * 根据单词和分类获取单词详情
 * @param {string} word - 单词文本
 * @param {string} category - 分类名称
 */
export async function getWordByWordAndCategory(word, category) {
  const wordData = await apiRequest(`/word/${category}/${word}`);

  // 转换数据格式
  return {
    ...wordData,
    partOfSpeech: wordData.part_of_speech,
    coreMeaning: wordData.core_meaning,
    toeicSceneFocus: wordData.toeic_scene_focus,
    sceneAssociation: wordData.scene_association,
    keyCollocations: wordData.keyCollocations || [],
    toeicExampleSentences: wordData.toeicExampleSentences || [],
    confusingWordsComparison: wordData.confusingWordsComparison || [],
  };
}

/**
 * 搜索单词
 * @param {string} query - 搜索关键词
 * @param {number} limit - 返回结果的最大数量，默认 50
 */
export async function searchWords(query, limit = 50) {
  const params = new URLSearchParams({ q: query });
  if (limit) {
    params.append('limit', limit);
  }

  const words = await apiRequest(`/search?${params.toString()}`);

  // 转换数据格式
  return words.map((word) => ({
    ...word,
    partOfSpeech: word.part_of_speech,
    coreMeaning: word.core_meaning,
    toeicSceneFocus: word.toeic_scene_focus,
    sceneAssociation: word.scene_association,
  }));
}

/**
 * 批量导入单词
 * @param {string} category - 分类名称
 * @param {Array} wordsData - 单词数据数组
 */
export async function importWords(category, wordsData) {
  const result = await apiRequest('/import', {
    method: 'POST',
    body: JSON.stringify({
      category,
      words: wordsData,
    }),
  });
  return result;
}

/**
 * 创建分类
 * @param {string} categoryKey - 分类标识（key）
 * @param {string} displayName - 中文名称
 */
export async function createCategory(categoryKey, displayName) {
  const result = await apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: categoryKey,
      display_name: displayName,
    }),
  });
  return result;
}
