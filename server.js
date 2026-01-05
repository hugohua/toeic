const express = require('express');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const { createParser } = require('eventsource-parser'); // Import eventsource-parser
const {
  getAllCategories,
  getWordsByCategory,
  getWordsByCategories,
  getWordCountByCategory,
  getWordDetail,
  getWordByWord,
  searchWords,
  batchImportWords,
  createCategory,
  saveArticle,
  getAllArticles,
  getArticleById,
  deleteArticle,
  saveNote,
  getAllNotes,
  getNotesByArticleId,
  deleteNote,
  getNoteById,
  getEtymology,
  saveEtymology,
  getWordIndexInCategory,
  getWordByIndex,
  getWordList,
  addWordToList,
  removeWordFromList,
  isWordInList,
  toggleWordInList,
} = require('./src/db/database');

// 加载配置：优先使用 config.js，如果不存在则从环境变量读取
let config;
const configPath = path.join(__dirname, 'config.js');
if (fs.existsSync(configPath)) {
  // 本地开发：使用 config.js
  config = require('./config');
} else {
  // Docker/生产环境：从环境变量读取
  config = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: process.env.OPENAI_MODEL || 'qwen3-max',
    },
  };
}

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseURL,
});

const app = express();
const isDev = process.env.NODE_ENV === 'development';
const PORT = isDev ? (process.env.PORT || 3001) : (process.env.PORT || 3000);

// 解析 JSON 请求体
app.use(express.json());

// 可用的模型列表
const AVAILABLE_MODELS = ['qwen-plus', 'qwen-flash', 'deepseek-v3.2'];

/**
 * 从模型列表中随机选择一个模型
 * @returns {string} 随机选择的模型名称
 */
function getRandomModel() {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_MODELS.length);
  return AVAILABLE_MODELS[randomIndex];
}

/**
 * 设置 SSE 响应头
 * @param {Object} res - Express响应对象
 */
function setSSEHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
}

/**
 * 发送 SSE 错误响应
 * @param {Object} res - Express响应对象
 * @param {string} errorMessage - 错误消息
 */
function sendSSEError(res, errorMessage) {
  setSSEHeaders(res);
  res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
  res.end();
}

/**
 * OpenAI 流式输出处理函数
 * @param {Object} res - Express响应对象
 * @param {string} prompt - 发送给OpenAI的提示词
 * @param {Object} options - 可选配置
 * @param {string} options.errorContext - 错误上下文（用于日志记录）
 * @param {string} options.defaultErrorMessage - 默认错误消息
 * @param {Function} options.onContent - 内容接收回调 (content) => void
 * @param {Function} options.onComplete - 完成回调 (fullContent) => void
 */
async function handleOpenAIStream(res, prompt, options = {}) {
  const { errorContext = 'OpenAI API', defaultErrorMessage = '处理失败', model, onContent, onComplete } = options;
  const modelToUse = model || config.openai.model;

  // 设置 SSE 响应头
  setSSEHeaders(res);

  let fullContent = '';

  try {
    // 调用 OpenAI API（流式）
    const stream = await openai.chat.completions.create({
      model: modelToUse,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    // 处理流式响应
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // 累积完整内容
        fullContent += content;

        // 发送 SSE 格式的数据
        res.write(`data: ${JSON.stringify({ type: 'content', data: content })}\n\n`);

        // 调用内容回调
        if (onContent) {
          onContent(content);
        }
      }
    }

    // 发送完成信号
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

    // 调用完成回调
    if (onComplete) {
      onComplete(fullContent);
    }
  } catch (error) {
    console.error(`${errorContext}错误:`, error);
    // 发送错误信息
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || defaultErrorMessage })}\n\n`);
    res.end();
  }
}

// ==================== TTS API (Real-time Streaming) ====================
app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).send('Text is required');
  }

  const model = 'qwen3-tts-flash';
  const selectedVoice = voice || 'Cherry';

  console.log(`TTS: Starting streaming for text length ${text.length}`);

  // 辅助函数：将文本分割为小块（< 500 字符以确保安全）
  function splitText(longText, maxLength = 500) {
    const chunks = [];
    // 移除 markdown 符号
    let cleaned = longText.replace(/[*#]/g, '');

    // 按标点符号分割
    const sentences = cleaned.match(/[^。！？.!?\n]+[。！？.!?\n]?/g) || [cleaned];

    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;

        // 如果单个句子本身就超长，强制切割
        while (currentChunk.length > maxLength) {
          chunks.push(currentChunk.slice(0, maxLength).trim());
          currentChunk = currentChunk.slice(maxLength);
        }
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    return chunks;
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const textChunks = splitText(text);
    console.log(`TTS: Split text into ${textChunks.length} chunks`);

    // 为了快速开始播放，只处理第一个文本块
    const chunkText = textChunks[0];
    console.log(`TTS: Processing first chunk only, length: ${chunkText.length}`);

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'enable'
      },
      body: JSON.stringify({
        model: model,
        input: {
          text: chunkText,
          voice: selectedVoice,
          language_type: "Chinese"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Aliyun TTS Error:', errorText);
      return res.status(response.status).send(errorText);
    }

    // 只收集最后的完整音频 URL
    let finalAudioUrl = null;

    const parser = createParser({
      onEvent: (event) => {
        if (event.data) {
          const dataStr = event.data;

          if (dataStr === '[DONE]') {
            return;
          }

          try {
            const data = JSON.parse(dataStr);

            if (data.output && data.output.audio) {
              // 只保存最后的完整 URL
              if (data.output.audio.url) {
                finalAudioUrl = data.output.audio.url;
                console.log(`TTS: Found complete audio URL`);
              }
            }

            if (data.code && data.message) {
              console.error('SSE Error:', data.message);
            }

          } catch (e) {
            console.error('Error parsing SSE data:', e.message);
          }
        }
      }
    });

    // 读取 SSE 流
    for await (const chunk of response.body) {
      parser.feed(chunk.toString());
    }

    if (!finalAudioUrl) {
      console.error('No final audio URL received');
      return res.status(500).send('No audio URL received');
    }

    console.log(`Downloading complete audio from URL`);
    const audioResponse = await fetch(finalAudioUrl);

    if (!audioResponse.ok) {
      console.error(`Failed to download audio: ${audioResponse.status}`);
      return res.status(500).send('Failed to download audio');
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    const completeAudio = Buffer.from(arrayBuffer);
    console.log(`TTS: Downloaded audio size: ${completeAudio.length} bytes`);

    // 检测音频格式（通过文件头）
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';

    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', completeAudio.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.send(completeAudio);

  } catch (error) {
    console.error('TTS API Error:', error);
    if (!res.headersSent) {
      res.status(500).send(error.message);
    } else {
      res.end();
    }
  }
});

// API 路由
// 获取所有分类
app.get('/api/categories', (req, res) => {
  try {
    const categories = getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建分类
app.post('/api/categories', (req, res) => {
  try {
    const { name, display_name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '分类标识（name）是必需的',
      });
    }

    const category = createCategory(name.trim(), display_name || null);
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('创建分类错误:', error);
    const statusCode = error.message.includes('已存在') ? 409 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// 根据分类获取单词列表
app.get('/api/words/:category', (req, res) => {
  try {
    const { category } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    const words = getWordsByCategory(category, limit, offset);
    const total = getWordCountByCategory(category);

    res.json({
      success: true,
      data: words,
      pagination: {
        total,
        limit,
        offset,
        hasMore: limit ? offset + words.length < total : false,
      },
    });
  } catch (error) {
    console.error('获取单词列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单词详情（通过 ID）
app.get('/api/word/:id', (req, res) => {
  try {
    const param = req.params.id;
    // 如果参数是纯数字，则作为 ID 处理
    if (/^\d+$/.test(param)) {
      const wordId = parseInt(param);
      const word = getWordDetail(wordId);

      if (!word) {
        return res.status(404).json({ success: false, error: '单词不存在' });
      }

      return res.json({ success: true, data: word });
    }
    // 否则作为单词文本处理
    const wordData = getWordByWord(param);

    if (!wordData) {
      return res.status(404).json({ success: false, error: '单词不存在' });
    }

    res.json({ success: true, data: wordData });
  } catch (error) {
    console.error('获取单词详情错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 搜索单词
app.get('/api/search', (req, res) => {
  try {
    const query = req.query.q;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    if (!query || query.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const words = searchWords(query.trim(), limit);
    res.json({ success: true, data: words });
  } catch (error) {
    console.error('搜索单词错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单词在分类中的索引
app.get('/api/word-index/:category/:word', (req, res) => {
  try {
    const { category, word } = req.params;

    if (!category || !word) {
      return res.status(400).json({
        success: false,
        error: '分类和单词参数是必需的',
      });
    }

    const index = getWordIndexInCategory(word, category);

    if (index === null) {
      return res.status(404).json({
        success: false,
        error: '未找到该单词',
      });
    }

    res.json({ success: true, data: { index } });
  } catch (error) {
    console.error('获取单词索引错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 通过索引获取单词详情
app.get('/api/word-detail/:category/:index', (req, res) => {
  try {
    const { category, index } = req.params;
    const wordIndex = parseInt(index);

    if (isNaN(wordIndex) || wordIndex < 0) {
      return res.status(400).json({
        success: false,
        error: '无效的索引',
      });
    }

    const wordDetail = getWordByIndex(category, wordIndex);

    if (!wordDetail) {
      return res.status(404).json({
        success: false,
        error: '未找到该单词',
      });
    }

    res.json({ success: true, data: wordDetail });
  } catch (error) {
    console.error('获取单词详情错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// 批量导入单词
app.post('/api/import', (req, res) => {
  try {
    const { category, words } = req.body;

    if (!category || typeof category !== 'string') {
      return res.status(400).json({
        success: false,
        error: '分类名称是必需的',
      });
    }

    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({
        success: false,
        error: '单词数据必须是非空数组',
      });
    }

    const result = batchImportWords(category, words);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('批量导入单词错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 保存文章
app.post('/api/articles', (req, res) => {
  try {
    const { title, content, categories } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '文章标题是必需的',
      });
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '文章内容是必需的',
      });
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        error: '分类数组是必需的且不能为空',
      });
    }

    const article = saveArticle(title.trim(), content.trim(), categories);
    res.json({ success: true, data: article });
  } catch (error) {
    console.error('保存文章错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有文章列表
app.get('/api/articles', (req, res) => {
  try {
    const articles = getAllArticles();
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('获取文章列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 根据ID获取文章详情
app.get('/api/articles/:id', (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    const article = getArticleById(articleId);

    if (!article) {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }

    res.json({ success: true, data: article });
  } catch (error) {
    console.error('获取文章详情错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除文章
app.delete('/api/articles/:id', (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    const deleted = deleteArticle(articleId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: '文章不存在' });
    }

    res.json({ success: true, message: '文章已删除' });
  } catch (error) {
    console.error('删除文章错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取文章下的所有笔记
app.get('/api/articles/:id/notes', (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    if (isNaN(articleId)) {
      return res.status(400).json({
        success: false,
        error: '无效的文章ID',
      });
    }

    const notes = getNotesByArticleId(articleId);
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('获取文章笔记错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 保存笔记
app.post('/api/notes', (req, res) => {
  try {
    const { article_id, title, content, type } = req.body;

    if (!article_id || typeof article_id !== 'number') {
      return res.status(400).json({
        success: false,
        error: '文章ID是必需的',
      });
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '笔记标题是必需的',
      });
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '笔记内容是必需的',
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        error: '笔记类型是必须的',
      });
    }

    const note = saveNote(article_id, title.trim(), content.trim(), type);
    res.json({ success: true, data: note });
  } catch (error) {
    console.error('保存笔记错误:', error);
    const statusCode = error.message.includes('已存在') || error.message.includes('不存在') ? 409 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

// 获取所有笔记列表
app.get('/api/notes', (req, res) => {
  try {
    const notes = getAllNotes();
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('获取笔记列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 根据ID获取笔记详情
app.get('/api/notes/:id', (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({
        success: false,
        error: '无效的笔记ID',
      });
    }

    const note = getNoteById(noteId);
    if (!note) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在',
      });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('获取笔记详情错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除笔记
app.delete('/api/notes/:id', (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({
        success: false,
        error: '无效的笔记ID',
      });
    }

    const deleted = deleteNote(noteId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在',
      });
    }

    res.json({ success: true, data: { id: noteId } });
  } catch (error) {
    console.error('删除笔记错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 单词列表 API ====================

// 获取指定类型的单词列表
app.get('/api/word-list/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { category } = req.query;

    // 验证 type 参数
    const validTypes = ['favorite', 'unknown', 'fuzzy'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: '无效的列表类型，必须是 favorite, unknown 或 fuzzy',
      });
    }

    const list = getWordList(type, category || null);
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('获取单词列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加单词到列表
app.post('/api/word-list', (req, res) => {
  try {
    const { word, category, type } = req.body;

    if (!word || !category || !type) {
      return res.status(400).json({
        success: false,
        error: '单词、分类和类型都是必需的',
      });
    }

    // 验证 type 参数
    const validTypes = ['favorite', 'unknown', 'fuzzy'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: '无效的列表类型，必须是 favorite, unknown 或 fuzzy',
      });
    }

    const result = addWordToList(word, category, type);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('添加单词到列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 从列表移除单词
app.delete('/api/word-list', (req, res) => {
  try {
    const { word, category, type } = req.body;

    if (!word || !category || !type) {
      return res.status(400).json({
        success: false,
        error: '单词、分类和类型都是必需的',
      });
    }

    const removed = removeWordFromList(word, category, type);
    res.json({ success: true, data: { removed } });
  } catch (error) {
    console.error('从列表移除单词错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 切换单词在列表中的状态
app.post('/api/word-list/toggle', (req, res) => {
  try {
    const { word, category, type } = req.body;

    if (!word || !category || !type) {
      return res.status(400).json({
        success: false,
        error: '单词、分类和类型都是必需的',
      });
    }

    // 验证 type 参数
    const validTypes = ['favorite', 'unknown', 'fuzzy'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: '无效的列表类型，必须是 favorite, unknown 或 fuzzy',
      });
    }

    const inList = toggleWordInList(word, category, type);
    res.json({ success: true, data: { inList } });
  } catch (error) {
    console.error('切换单词列表状态错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== END 单词列表 API ====================

// 翻译API - 流式输出
app.post('/api/translate', async (req, res) => {
  const { wordlist } = req.body;

  if (!wordlist || typeof wordlist !== 'string' || wordlist.trim() === '') {
    sendSSEError(res, '单词/句子是必需的');
    return;
  }

  // 构建 prompt
  const prompt = `请将句子或单词进行翻译，若给出英文则翻译成中文，若给出中文则翻译成英文。单词/句子是：${wordlist.trim()}`;
  // 使用公共函数处理流式输出，随机选择模型
  await handleOpenAIStream(res, prompt, {
    errorContext: '翻译',
    defaultErrorMessage: '翻译失败',
    model: getRandomModel(),
  });
});

// 语法解析API - 流式输出
app.post('/api/grammar-analyze', async (req, res) => {
  const { selection } = req.body;

  if (!selection || typeof selection !== 'string' || selection.trim() === '') {
    sendSSEError(res, '待解析内容（selection）是必需的');
    return;
  }

  // 构建 prompt
  const prompt = `请分析该句子/短语/单词的语法结构：${selection.trim()}`;

  // 使用公共函数处理流式输出，随机选择模型
  await handleOpenAIStream(res, prompt, {
    errorContext: '语法解析',
    defaultErrorMessage: '语法解析失败',
    model: getRandomModel(),
  });
});

// 获取构词法API - 优先查库，不存在则调用OpenAI
app.get('/api/etymology/:word', async (req, res) => {
  try {
    const { word } = req.params;
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ success: false, error: '单词参数无效' });
    }

    // 1. 先查询数据库
    const existing = getEtymology(word);
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    // 2. 数据库不存在，调用 OpenAI 生成（流式）
    // 注意：客户端需要处理两种响应格式：
    // - JSON (Content-Type: application/json): 命中缓存，直接返回
    // - SSE (Content-Type: text/event-stream): 未命中，流式返回

    const prompt = `请用构词法解释并给出含义理解，帮助理解和记忆单词:${word}`;

    await handleOpenAIStream(res, prompt, {
      errorContext: '构词法解析',
      defaultErrorMessage: '获取构词法失败',
      model: 'deepseek-v3.2', // 指定使用 deepseek-v3.2
      onComplete: (fullContent) => {
        // 生成完成后保存到数据库
        if (fullContent && fullContent.trim()) {
          try {
            saveEtymology(word, fullContent);
            console.log(`构词法已保存: ${word}`);
          } catch (e) {
            console.error(`保存构词法失败: ${e.message}`);
          }
        }
      }
    });

  } catch (error) {
    console.error('获取构词法错误:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// 生成文章（根据分类数组）- 流式输出
app.post('/api/generate-article', async (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories) || categories.length === 0) {
    sendSSEError(res, '分类数组是必需的且不能为空');
    return;
  }

  // 获取所选分类下的所有单词
  const words = getWordsByCategories(categories);

  if (words.length === 0) {
    sendSSEError(res, '所选分类下没有单词');
    return;
  }

  // 打乱单词列表以避免缓存（Fisher-Yates洗牌算法）
  const shuffledWords = [...words];
  for (let i = shuffledWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
  }

  // 构建单词列表字符串
  const wordList = shuffledWords.map((w) => w.word).join(', ');

  // 构建 prompt
  const prompt = `${wordList}
    你是一位专业的托业（TOEIC）英语教师。以上是一组职场英语词汇：
请完成以下任务：
1、从中精选10–15个语义相关、能自然融入同一职场场景的单词；
2、围绕这些词写一篇250–300字的英文短文，内容需符合真实职场语境（如招聘通知、内部公告、人力资源邮件等），语言正式、语法正确、逻辑通顺，适合托业阅读练习；
3、文中所选单词必须加粗标出；
4、为文章添加一个明确的标题；
5、在英文文章后，提供对应的中文翻译，翻译中对应的关键词也需加粗。
注意：避免生硬堆砌词汇，确保语言自然流畅，体现真实商务英语用法。`;

  // 使用公共函数处理流式输出
  await handleOpenAIStream(res, prompt, {
    errorContext: '生成文章',
    defaultErrorMessage: '生成文章失败',
    model: 'qwen-plus',
  });
});

// 开发模式下不提供静态文件（由 webpack-dev-server 提供）
if (!isDev) {
  // 设置静态文件目录（指向构建后的dist目录）
  app.use(express.static(path.join(__dirname, 'dist')));

  // 路由：所有请求都返回index.html（用于React Router）
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});
