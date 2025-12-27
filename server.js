const express = require('express');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const {
  getAllCategories,
  getWordsByCategory,
  getWordsByCategories,
  getWordCountByCategory,
  getWordDetail,
  getWordByWordAndCategory,
  getWordByWord,
  searchWords,
  batchImportWords,
  createCategory,
  saveArticle,
  getAllArticles,
  getArticleById,
  deleteArticle,
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

// 根据单词和分类获取单词详情（保留向后兼容）
app.get('/api/word/:category/:word', (req, res) => {
  try {
    const { category, word } = req.params;
    const wordData = getWordByWordAndCategory(word, category);

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

// 生成文章（根据分类数组）- 流式输出
app.post('/api/generate-article', async (req, res) => {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: '分类数组是必需的且不能为空' })}\n\n`);
      res.end();
      return;
    }

    // 获取所选分类下的所有单词
    const words = getWordsByCategories(categories);
    
    if (words.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: '所选分类下没有单词' })}\n\n`);
      res.end();
      return;
    }

    // 构建单词列表字符串
    const wordList = words.map((w) => w.word).join(', ');

    // 构建 prompt
    const prompt = `${wordList} 请选取10-20个左右的单词，输出一篇文章用于背诵单词和记住语法，其中涉及的单词需要加粗。同时输出对应的中文翻译。要求语句通顺，符合托业阅读考试场景，单篇文章长度在300字左右`;

    // 调用 OpenAI API 生成文章（流式）
    const stream = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });

    // 处理流式响应
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // 发送 SSE 格式的数据
        res.write(`data: ${JSON.stringify({ type: 'content', data: content })}\n\n`);
      }
    }

    // 发送完成信号
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('生成文章错误:', error);
    // 发送错误信息
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || '生成文章失败' })}\n\n`);
    res.end();
  }
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
  console.log('=================================');
  if (isDev) {
    console.log('🚀 API 服务器已启动（开发模式）');
    console.log('=================================');
    console.log(`📡 API 地址: http://localhost:${PORT}/api`);
    console.log('=================================');
    console.log('💡 前端开发服务器运行在 http://localhost:3000');
  } else {
    console.log('🚀 背单词应用服务器已启动！');
    console.log('=================================');
    console.log(`📱 本地访问: http://localhost:${PORT}`);
    console.log(`🌐 网络访问: http://0.0.0.0:${PORT}`);
    console.log('=================================');
    console.log('💡 提示: 请先运行 npm run build 构建项目');
  }
  console.log('按 Ctrl+C 停止服务器');
  console.log('=================================');
});

