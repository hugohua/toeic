# 数据库使用说明

## 概述

本项目使用 SQLite 数据库存储单词数据，提供了完整的数据库操作模块和 RESTful API 接口。

## 数据库结构

数据库文件位置：`data/words.db`

### 表结构

1. **categories** - 分类表
   - `id`: 主键
   - `name`: 分类名称（唯一）
   - `created_at`: 创建时间

2. **words** - 单词表
   - `id`: 主键
   - `category_id`: 分类ID（外键）
   - `word`: 单词
   - `phonetic`: 音标
   - `part_of_speech`: 词性
   - `core_meaning`: 核心含义
   - `toeic_scene_focus`: TOEIC场景重点
   - `scene_association`: 场景联想
   - `phrase`: 短语
   - `created_at`: 创建时间

3. **key_collocations** - 关键搭配表
   - `id`: 主键
   - `word_id`: 单词ID（外键）
   - `collocation`: 搭配内容
   - `position`: 位置索引

4. **example_sentences** - 例句表
   - `id`: 主键
   - `word_id`: 单词ID（外键）
   - `sentence`: 例句内容
   - `position`: 位置索引

5. **confusing_words** - 易混淆词表
   - `id`: 主键
   - `word_id`: 单词ID（外键）
   - `confusing_word`: 易混淆词
   - `core_difference`: 核心区别
   - `toeic_scene_focus`: TOEIC场景重点
   - `position`: 位置索引

## 数据导入

### 首次导入

运行以下命令将 `src/data.js` 中的数据导入到 SQLite 数据库：

```bash
npm run import-data
```

该脚本会：
1. 读取 `src/data.js` 文件
2. 解析单词数据
3. 创建数据库表结构（如果不存在）
4. 将所有单词数据导入数据库

### 导入结果

导入完成后会显示：
- 分类数量
- 单词总数
- 每个分类的处理进度

## 数据库操作模块

数据库操作模块位于 `src/db/database.js`，提供了以下功能：

### 主要函数

- `getAllCategories()` - 获取所有分类
- `getWordsByCategory(categoryName, limit, offset)` - 根据分类获取单词列表
- `getWordCountByCategory(categoryName)` - 获取分类下的单词数量
- `getWordDetail(wordId)` - 获取单词详情（包含所有关联数据）
- `getWordByWord(wordText)` - 根据单词文本获取详情（不依赖分类）
- `searchWords(query, limit)` - 搜索单词

## API 接口

服务器提供了以下 API 端点（详见 `API.md`）：

- `GET /api/categories` - 获取所有分类
- `GET /api/words/:category` - 获取分类下的单词列表
- `GET /api/word/:id` - 根据ID或单词文本获取单词详情
- `GET /api/search?q=关键词` - 搜索单词

## 启动服务器

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动，API 端点可通过 `http://localhost:3000/api/*` 访问。

## 注意事项

1. 数据库文件 `data/words.db` 会在首次运行时自动创建
2. 如果修改了 `src/data.js`，需要重新运行 `npm run import-data` 来更新数据库
3. 数据库使用外键约束，删除分类时会级联删除相关单词数据
4. 所有表都创建了适当的索引以提高查询性能

