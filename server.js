const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 设置静态文件目录（指向构建后的dist目录）
app.use(express.static(path.join(__dirname, 'dist')));

// 路由：所有请求都返回index.html（用于React Router）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 背单词应用服务器已启动！');
  console.log('=================================');
  console.log(`📱 本地访问: http://localhost:${PORT}`);
  console.log(`🌐 网络访问: http://0.0.0.0:${PORT}`);
  console.log('=================================');
  console.log('💡 提示: 请先运行 npm run build 构建项目');
  console.log('按 Ctrl+C 停止服务器');
  console.log('=================================');
});

