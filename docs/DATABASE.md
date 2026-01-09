# 数据库使用说明

## 概述

本项目使用 SQLite 数据库存储单词数据，提供了完整的数据库操作模块和 RESTful API 接口。

## 数据库结构

数据库文件位置：`data/words.db`

### 表结构

#### 1. categories - 分类表
   - `id`: 主键
   - `name`: 分类名称(唯一,英文 key)
   - `display_name`: 显示名称(中文)
   - `icon`: 图标
   - `desc`: 描述
   - `created_at`: 创建时间

#### 2. words - 单词表
   - `id`: 主键
   - `category_id`: 分类ID(外键)
   - `word`: 单词
   - `phonetic`: 音标
   - `part_of_speech`: 词性
   - `core_meaning`: 核心含义
   - `toeic_scene_focus`: TOEIC场景重点
   - `scene_association`: 场景联想
   - `phrase`: 短语
   - `created_at`: 创建时间

#### 3. key_collocations - 关键搭配表
   - `id`: 主键
   - `word_id`: 单词ID(外键)
   - `collocation`: 搭配内容
   - `position`: 位置索引

#### 4. example_sentences - 例句表
   - `id`: 主键
   - `word_id`: 单词ID(外键)
   - `sentence`: 例句内容
   - `position`: 位置索引

#### 5. confusing_words - 易混淆词表
   - `id`: 主键
   - `word_id`: 单词ID(外键)
   - `confusing_word`: 易混淆词
   - `core_difference`: 核心区别
   - `toeic_scene_focus`: TOEIC场景重点
   - `position`: 位置索引

#### 6. articles - 文章表
   - `id`: 主键
   - `title`: 文章标题
   - `content`: 文章内容
   - `categories`: 分类数组(JSON)
   - `created_at`: 创建时间

#### 7. notes - 笔记表
   - `id`: 主键
   - `article_id`: 文章ID(外键)
   - `title`: 笔记标题
   - `content`: 笔记内容
   - `type`: 笔记类型
   - `created_at`: 创建时间

#### 8. etymologies - 构词法表
   - `word`: 单词(主键)
   - `content`: 构词法内容
   - `created_at`: 创建时间

#### 9. word_lists - 单词列表表
   - `id`: 主键
   - `word`: 单词
   - `category`: 分类
   - `type`: 类型(favorite/unknown/fuzzy)
   - `created_at`: 创建时间

#### 10. audio_cache - 音频缓存表
   - `id`: 主键
   - `hash`: 音频哈希值(唯一)
   - `text`: 文本内容
   - `voice`: 语音类型
   - `language`: 语言
   - `file_name`: 文件名
   - `file_path`: 文件路径
   - `file_size`: 文件大小
   - `duration`: 时长
   - `created_at`: 创建时间
   - `last_access_at`: 最后访问时间
   - `access_count`: 访问次数

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

数据库操作模块位于 `src/db/database.js`,提供了以下功能:

### 分类相关
- `getAllCategories()` - 获取所有分类
- `getOrCreateCategory(categoryName, displayName, icon, desc)` - 获取或创建分类
- `createCategory(categoryName, displayName, icon, desc)` - 创建新分类

### 单词相关
- `getWordsByCategory(categoryName, limit, offset)` - 根据分类获取单词列表
- `getWordCountByCategory(categoryName)` - 获取分类下的单词数量
- `getWordDetail(wordId)` - 获取单词详情(包含所有关联数据)
- `getWordByWord(wordText)` - 根据单词文本获取详情(不依赖分类)
- `searchWords(query, limit)` - 搜索单词
- `batchImportWords(categoryName, wordsData)` - 批量导入单词
- `getWordsByCategories(categoryNames)` - 根据多个分类获取单词列表

### 文章相关
- `saveArticle(title, content, categories)` - 保存文章
- `getAllArticles()` - 获取所有文章列表
- `getArticleById(articleId)` - 根据ID获取文章详情
- `deleteArticle(articleId)` - 删除文章

### 笔记相关
- `saveNote(articleId, title, content, type)` - 保存笔记
- `getAllNotes()` - 获取所有笔记
- `getNoteById(noteId)` - 根据ID获取笔记详情
- `getNotesByArticle(articleId)` - 获取文章的所有笔记
- `deleteNote(noteId)` - 删除笔记

### 构词法相关
- `saveEtymology(word, content)` - 保存构词法
- `getEtymology(word)` - 获取单词的构词法

### 单词列表相关
- `addToWordList(word, category, type)` - 添加单词到列表
- `removeFromWordList(word, category, type)` - 从列表移除单词
- `getWordList(type, category)` - 获取单词列表
- `isWordInList(word, category, type)` - 检查单词是否在列表中

### 音频缓存相关
- `saveAudioCache(cacheData)` - 保存音频缓存记录
- `getAudioCache(hash)` - 获取音频缓存记录
- `updateAudioAccess(hash)` - 更新音频访问记录
- `getAudioStats()` - 获取音频缓存统计

## API 接口

服务器提供了以下 API 端点(详见 `API.md`):

### 单词相关
- `GET /api/categories` - 获取所有分类
- `GET /api/words/:category` - 获取分类下的单词列表
- `GET /api/word/:id` - 根据ID获取单词详情
- `GET /api/word/:category/:word` - 根据分类和单词获取详情
- `GET /api/word-index/:category/:word` - 获取单词在分类中的索引
- `GET /api/word-detail/:category/:index` - 根据索引获取单词详情
- `GET /api/search` - 搜索单词
- `POST /api/categories` - 创建新分类
- `POST /api/words/import` - 批量导入单词

### 文章相关
- `GET /api/articles` - 获取所有文章
- `GET /api/articles/:id` - 获取文章详情
- `GET /api/articles/:id/notes` - 获取文章的所有笔记
- `POST /api/articles` - 保存文章
- `DELETE /api/articles/:id` - 删除文章

### 笔记相关
- `GET /api/notes` - 获取所有笔记
- `GET /api/notes/:id` - 获取笔记详情
- `POST /api/notes` - 保存笔记
- `DELETE /api/notes/:id` - 删除笔记

### 构词法相关
- `GET /api/etymology/:word` - 获取单词构词法(支持 AI 生成)

### 单词列表相关
- `GET /api/word-list/:type` - 获取单词列表(favorite/unknown/fuzzy)
- `POST /api/word-list/:type` - 添加单词到列表
- `DELETE /api/word-list/:type` - 从列表移除单词

### AI 生成相关
- `POST /api/generate/article` - AI 生成文章
- `POST /api/generate/notes` - AI 生成笔记

### 音频相关
- `GET /api/audio/check/:hash` - 检查音频缓存
- `GET /api/audio/stats` - 获取音频统计

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

