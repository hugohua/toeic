const express = require('express');
const path = require('path');
const {
  getAllCategories,
  getWordsByCategory,
  getWordCountByCategory,
  getWordDetail,
  getWordByWordAndCategory,
  searchWords,
  batchImportWords,
  createCategory,
} = require('./src/db/database');

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
    const wordId = parseInt(req.params.id);
    const word = getWordDetail(wordId);

    if (!word) {
      return res.status(404).json({ success: false, error: '单词不存在' });
    }

    res.json({ success: true, data: word });
  } catch (error) {
    console.error('获取单词详情错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 根据单词和分类获取单词详情
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

