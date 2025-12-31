// API 基础 URL
// webpack DefinePlugin 会在构建时注入 process.env.REACT_APP_API_URL
// 开发模式: '/api' (通过 webpack-dev-server 代理到后端 3001 端口)
// 生产模式: 'http://localhost:3000/api'
// 可以通过 window.API_BASE_URL 在运行时覆盖配置
const API_BASE_URL =
  (typeof window !== 'undefined' && window.API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  '/api';

// 单词列表缓存：{ [category]: { words: Array, timestamp: number } }
const wordListCache = {};

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
  // 仅缓存全量加载场景（limit=null, offset=0）
  const isFullLoad = limit === null && offset === 0;

  // 检查缓存（仅全量加载时）
  if (isFullLoad && wordListCache[category]) {
    // 返回深拷贝，避免组件间数据污染
    return wordListCache[category].words.map((word) => ({ ...word }));
  }

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
  const formattedResult = result.map((word) => ({
    ...word,
    partOfSpeech: word.part_of_speech,
    coreMeaning: word.core_meaning,
    toeicSceneFocus: word.toeic_scene_focus,
    sceneAssociation: word.scene_association,
  }));

  // 更新缓存（仅全量加载时）
  if (isFullLoad) {
    wordListCache[category] = {
      words: formattedResult.map((word) => ({ ...word })), // 深拷贝存储
      timestamp: Date.now(),
    };
  }

  return formattedResult;
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
 * 根据单词获取单词详情（不依赖分类）
 * @param {string} word - 单词文本
 */
export async function getWordByWord(word) {
  const wordData = await apiRequest(`/word/${word}`);

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

/**
 * 保存文章
 * @param {string} title - 文章标题
 * @param {string} content - 文章内容
 * @param {Array<string>} categories - 分类数组
 */
export async function saveArticle(title, content, categories) {
  return apiRequest('/articles', {
    method: 'POST',
    body: JSON.stringify({
      title,
      content,
      categories,
    }),
  });
}

/**
 * 获取所有文章列表
 */
export async function getAllArticles() {
  return apiRequest('/articles');
}

/**
 * 根据ID获取文章详情
 * @param {number} articleId - 文章ID
 */
export async function getArticleById(articleId) {
  return apiRequest(`/articles/${articleId}`);
}

/**
 * 删除文章
 * @param {number} articleId - 文章ID
 */
export async function deleteArticle(articleId) {
  return apiRequest(`/articles/${articleId}`, {
    method: 'DELETE',
  });
}

/**
 * 保存笔记
 * @param {string} title - 笔记标题（唯一，不重复）
 * @param {string} content - 笔记内容
 * @param {string} type - 笔记类型：'单词' 或 '短语'
 */
export async function saveNote(title, content, type) {
  return apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify({
      title,
      content,
      type,
    }),
  });
}

/**
 * 获取所有笔记列表
 */
export async function getAllNotes() {
  return apiRequest('/notes');
}

/**
 * 根据ID获取笔记详情
 * @param {number} noteId - 笔记ID
 */
export async function getNoteById(noteId) {
  return apiRequest(`/notes/${noteId}`);
}

/**
 * 删除笔记
 * @param {number} noteId - 笔记ID
 */
export async function deleteNote(noteId) {
  return apiRequest(`/notes/${noteId}`, {
    method: 'DELETE',
  });
}

/**
 * 通用的流式请求处理函数（处理 OpenAI SSE 格式响应）
 * @param {string} endpoint - API endpoint（例如 '/generate-article'）
 * @param {object} requestBody - 请求体数据
 * @param {Function} onChunk - 接收每个内容块的回调函数 (chunk: string) => void
 * @param {Function} onError - 错误回调函数 (error: Error) => void
 * @param {Function} onComplete - 完成回调函数 () => void
 * @param {AbortSignal} signal - 可选的 AbortSignal，用于中止请求
 * @param {string} defaultErrorMessage - 默认错误消息
 * @param {string} operationName - 操作名称（用于日志）
 */
async function streamRequest(
  endpoint,
  requestBody,
  onChunk,
  onError,
  onComplete,
  signal = null,
  defaultErrorMessage = '请求失败',
  operationName = '操作'
) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `API 请求失败: ${response.status} ${response.statusText}`
      );
    }

    // 读取流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      // 检查是否已中止
      if (signal && signal.aborted) {
        reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      
      if (done) {
        if (onComplete && !signal?.aborted) onComplete();
        break;
      }

      // 检查是否已中止
      if (signal && signal.aborted) {
        reader.cancel();
        break;
      }

      // 解码数据
      buffer += decoder.decode(value, { stream: true });
      
      // 处理完整的 SSE 消息
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // 保留最后一个不完整的消息

      for (const line of lines) {
        if (signal && signal.aborted) break;
        
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'content' && data.data) {
              if (onChunk && !signal?.aborted) onChunk(data.data);
            } else if (data.type === 'error') {
              const error = new Error(data.error || defaultErrorMessage);
              if (onError && !signal?.aborted) {
                onError(error);
              } else if (!signal?.aborted) {
                throw error;
              }
            } else if (data.type === 'done') {
              if (onComplete && !signal?.aborted) onComplete();
            }
          } catch (parseError) {
            if (!signal?.aborted) {
              console.error('解析 SSE 数据错误:', parseError);
            }
          }
        }
      }
    }
  } catch (error) {
    // 如果是中止错误，不处理
    if (error.name === 'AbortError' || (signal && signal.aborted)) {
      return;
    }
    console.error(`${operationName}错误:`, error);
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
}

/**
 * 生成文章（流式输出）
 * @param {Array<string>} categories - 分类数组
 * @param {Function} onChunk - 接收每个内容块的回调函数 (chunk: string) => void
 * @param {Function} onError - 错误回调函数 (error: Error) => void
 * @param {Function} onComplete - 完成回调函数 () => void
 * @param {AbortSignal} signal - 可选的 AbortSignal，用于中止请求
 */
export async function generateArticle(categories, onChunk, onError, onComplete, signal = null) {
  return streamRequest(
    '/generate-article',
    { categories },
    onChunk,
    onError,
    onComplete,
    signal,
    '生成文章失败',
    '生成文章'
  );
}

/**
 * 翻译（流式输出）
 * @param {string} wordlist - 待翻译的单词或句子
 * @param {Function} onChunk - 接收每个内容块的回调函数 (chunk: string) => void
 * @param {Function} onError - 错误回调函数 (error: Error) => void
 * @param {Function} onComplete - 完成回调函数 () => void
 * @param {AbortSignal} signal - 可选的 AbortSignal，用于中止请求
 */
export async function translate(wordlist, onChunk, onError, onComplete, signal = null) {
  return streamRequest(
    '/translate',
    { wordlist },
    onChunk,
    onError,
    onComplete,
    signal,
    '翻译失败',
    '翻译'
  );
}

/**
 * 语法解析（流式输出）
 * @param {string} selection - 待解析的内容
 * @param {Function} onChunk - 接收每个内容块的回调函数 (chunk: string) => void
 * @param {Function} onError - 错误回调函数 (error: Error) => void
 * @param {Function} onComplete - 完成回调函数 () => void
 * @param {AbortSignal} signal - 可选的 AbortSignal，用于中止请求
 */
export async function grammarAnalyze(selection, onChunk, onError, onComplete, signal = null) {
  return streamRequest(
    '/grammar-analyze',
    { selection },
    onChunk,
    onError,
    onComplete,
    signal,
    '语法解析失败',
    '语法解析'
  );
}
