# API 文档

## 概述

本应用提供了 RESTful API 接口，用于从 SQLite 数据库中获取单词数据。

## 基础 URL

```
http://localhost:3000/api
```

## API 端点

### 1. 获取所有分类

获取所有单词分类列表。

**请求**
```
GET /api/categories
```

**响应**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "mixiaole",
      "created_at": "2024-01-01 12:00:00"
    }
  ]
}
```

### 2. 根据分类获取单词列表

获取指定分类下的单词列表，支持分页。

**请求**
```
GET /api/words/:category
```

**查询参数**
- `limit` (可选): 每页返回的单词数量
- `offset` (可选): 跳过的单词数量，用于分页

**示例**
```
GET /api/words/mixiaole?limit=20&offset=0
```

**响应**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category_id": 1,
      "word": "beverage",
      "phonetic": "/ˈbevərɪdʒ/",
      "part_of_speech": "n. 名词",
      "core_meaning": "饮料（指除水以外的任何饮品，如咖啡、茶、果汁等）",
      "toeic_scene_focus": "...",
      "scene_association": "...",
      "phrase": "Complementary beverage service is provided.",
      "category_name": "mixiaole"
    }
  ],
  "pagination": {
    "total": 1000,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3. 根据 ID 获取单词详情

获取指定 ID 的单词完整信息，包括关键搭配、例句和易混淆词。

**请求**
```
GET /api/word/:id
```

**示例**
```
GET /api/word/1
```

**响应**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "category_id": 1,
    "word": "beverage",
    "phonetic": "/ˈbevərɪdʒ/",
    "part_of_speech": "n. 名词",
    "core_meaning": "饮料（指除水以外的任何饮品，如咖啡、茶、果汁等）",
    "toeic_scene_focus": "...",
    "scene_association": "...",
    "phrase": "Complementary beverage service is provided.",
    "category_name": "mixiaole",
    "keyCollocations": [
      "hot beverage（热饮）",
      "alcoholic beverage（酒精饮料）",
      "beverage selection（饮料选择）"
    ],
    "toeicExampleSentences": [
      "The hotel offers a complimentary beverage to guests upon arrival.",
      "Please specify your preferred beverage when making a reservation."
    ],
    "confusingWordsComparison": [
      {
        "word": "drink",
        "coreDifference": "drink更通用；beverage更正式",
        "toeicSceneFocus": "餐饮、服务场景"
      }
    ]
  }
}
```

### 4. 根据单词和分类获取单词详情

根据单词文本和分类名称获取单词详情。

**请求**
```
GET /api/word/:category/:word
```

**示例**
```
GET /api/word/mixiaole/beverage
```

**响应**
与"根据 ID 获取单词详情"相同格式。

### 5. 搜索单词

根据关键词搜索单词，支持按单词或释义搜索。

**请求**
```
GET /api/search?q=关键词&limit=50
```

**查询参数**
- `q` (必需): 搜索关键词
- `limit` (可选): 返回结果的最大数量，默认 50

**示例**
```
GET /api/search?q=beverage&limit=10
```

**响应**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "word": "beverage",
      "phonetic": "/ˈbevərɪdʒ/",
      "part_of_speech": "n. 名词",
      "core_meaning": "饮料（指除水以外的任何饮品，如咖啡、茶、果汁等）",
      "category_name": "mixiaole"
    }
  ]
}
```

## 错误响应

所有 API 在出错时都会返回以下格式：

```json
{
  "success": false,
  "error": "错误信息"
}
```

HTTP 状态码：
- `200`: 成功
- `404`: 资源不存在
- `500`: 服务器内部错误

## 使用示例

### JavaScript (Fetch API)

```javascript
// 获取所有分类
fetch('http://localhost:3000/api/categories')
  .then(res => res.json())
  .then(data => console.log(data));

// 获取单词列表
fetch('http://localhost:3000/api/words/mixiaole?limit=20&offset=0')
  .then(res => res.json())
  .then(data => console.log(data));

// 搜索单词
fetch('http://localhost:3000/api/search?q=beverage')
  .then(res => res.json())
  .then(data => console.log(data));
```

### cURL

```bash
# 获取所有分类
curl http://localhost:3000/api/categories

# 获取单词列表
curl http://localhost:3000/api/words/mixiaole?limit=20

# 搜索单词
curl "http://localhost:3000/api/search?q=beverage"
```

