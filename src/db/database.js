const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, '../../data', 'words.db');

// 创建数据库连接
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

/**
 * 数据库迁移：添加 display_name、icon、desc 字段
 */
function migrateDatabase() {
  try {
    const tableInfo = db.pragma('table_info(categories)');
    const columnNames = tableInfo.map((col) => col.name);

    // 检查并添加 display_name 字段
    if (!columnNames.includes('display_name')) {
      console.log('正在迁移数据库：添加 display_name 字段...');
      db.exec('ALTER TABLE categories ADD COLUMN display_name TEXT');
      console.log('数据库迁移完成：display_name 字段已添加');
    }

    // 检查并添加 icon 字段
    if (!columnNames.includes('icon')) {
      console.log('正在迁移数据库：添加 icon 字段...');
      db.exec('ALTER TABLE categories ADD COLUMN icon TEXT');
      console.log('数据库迁移完成：icon 字段已添加');
    }

    // 检查并添加 desc 字段
    if (!columnNames.includes('desc')) {
      console.log('正在迁移数据库：添加 desc 字段...');
      db.exec('ALTER TABLE categories ADD COLUMN desc TEXT');
      console.log('数据库迁移完成：desc 字段已添加');
    }

    // 迁移 notes 表：添加 article_id 字段
    try {
      const notesTableInfo = db.pragma('table_info(notes)');
      const notesColumnNames = notesTableInfo.map((col) => col.name);

      if (!notesColumnNames.includes('article_id')) {
        console.log('正在迁移数据库：修改 notes 表结构...');
        
        // 由于旧笔记无法确定关联的文章，删除所有旧笔记数据（根据需求无需兼容）
        db.exec('DELETE FROM notes');
        console.log('已清理旧的笔记数据（无法确定关联文章）');
        
        // 删除旧表并重新创建（SQLite 不支持直接修改 UNIQUE 约束）
        db.exec('DROP TABLE IF EXISTS notes');
        
        // 重新创建 notes 表（使用新的结构）
        db.exec(`
          CREATE TABLE notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
            UNIQUE(article_id, title)
          );
        `);
        
        // 重新创建索引
        db.exec('CREATE INDEX IF NOT EXISTS idx_notes_article_id ON notes(article_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at)');
        
        console.log('数据库迁移完成：notes 表结构已更新');
      }
    } catch (error) {
      console.error('notes 表迁移失败:', error);
    }
  } catch (error) {
    console.error('数据库迁移失败:', error);
  }
}

/**
 * 初始化数据库表结构
 */
function initDatabase() {
  // 创建分类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT,
      icon TEXT,
      desc TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 数据库迁移：如果表已存在但没有 display_name 字段，则添加
  migrateDatabase();

  // 创建单词表
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      word TEXT NOT NULL,
      phonetic TEXT,
      part_of_speech TEXT,
      core_meaning TEXT,
      toeic_scene_focus TEXT,
      scene_association TEXT,
      phrase TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      UNIQUE(category_id, word)
    );
  `);

  // 创建关键搭配表
  db.exec(`
    CREATE TABLE IF NOT EXISTS key_collocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      collocation TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `);

  // 创建例句表
  db.exec(`
    CREATE TABLE IF NOT EXISTS example_sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      sentence TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `);

  // 创建易混淆词对比表
  db.exec(`
    CREATE TABLE IF NOT EXISTS confusing_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      confusing_word TEXT NOT NULL,
      core_difference TEXT,
      toeic_scene_focus TEXT,
      position INTEGER NOT NULL,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `);

  // 创建文章表
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      categories TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 创建笔记表
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      UNIQUE(article_id, title)
    );
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_words_category ON words(category_id);
    CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
    CREATE INDEX IF NOT EXISTS idx_collocations_word ON key_collocations(word_id);
    CREATE INDEX IF NOT EXISTS idx_sentences_word ON example_sentences(word_id);
    CREATE INDEX IF NOT EXISTS idx_confusing_word ON confusing_words(word_id);
    CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_article_id ON notes(article_id);
    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
  `);
}

/**
 * 获取或创建分类
 */
function getOrCreateCategory(categoryName, displayName = null, icon = null, desc = null) {
  let category = db
    .prepare('SELECT id FROM categories WHERE name = ?')
    .get(categoryName);

  if (!category) {
    const insert = db.prepare(
      'INSERT INTO categories (name, display_name, icon, desc) VALUES (?, ?, ?, ?)'
    );
    const result = insert.run(categoryName, displayName, icon, desc);
    return { id: result.lastInsertRowid };
  }

  return category;
}

/**
 * 创建分类
 */
function createCategory(categoryName, displayName, icon = null, desc = null) {
  if (!categoryName || typeof categoryName !== 'string' || categoryName.trim() === '') {
    throw new Error('分类名称（key）是必需的');
  }

  // 检查是否已存在
  const existing = db
    .prepare('SELECT id FROM categories WHERE name = ?')
    .get(categoryName);

  if (existing) {
    throw new Error('分类已存在');
  }

  const insert = db.prepare(
    'INSERT INTO categories (name, display_name, icon, desc) VALUES (?, ?, ?, ?)'
  );
  const result = insert.run(categoryName.trim(), displayName || null, icon || null, desc || null);
  
  return {
    id: result.lastInsertRowid,
    name: categoryName.trim(),
    display_name: displayName || null,
    icon: icon || null,
    desc: desc || null,
  };
}

/**
 * 插入单词数据
 */
function insertWord(categoryId, wordData) {
  const insertWord = db.prepare(`
    INSERT OR REPLACE INTO words (
      category_id, word, phonetic, part_of_speech, core_meaning,
      toeic_scene_focus, scene_association, phrase
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertWord.run(
    categoryId,
    wordData.word,
    wordData.phonetic || null,
    wordData.partOfSpeech || null,
    wordData.coreMeaning || null,
    wordData.toeicSceneFocus || null,
    wordData.sceneAssociation || null,
    wordData.phrase || null
  );

  return result.lastInsertRowid;
}

/**
 * 插入关键搭配
 */
function insertCollocations(wordId, collocations) {
  if (!Array.isArray(collocations) || collocations.length === 0) {
    return;
  }

  const deleteOld = db.prepare(
    'DELETE FROM key_collocations WHERE word_id = ?'
  );
  deleteOld.run(wordId);

  const insert = db.prepare(`
    INSERT INTO key_collocations (word_id, collocation, position)
    VALUES (?, ?, ?)
  `);

  const insertMany = db.transaction((collocations) => {
    for (let i = 0; i < collocations.length; i++) {
      insert.run(wordId, collocations[i], i);
    }
  });

  insertMany(collocations);
}

/**
 * 插入例句
 */
function insertExampleSentences(wordId, sentences) {
  if (!Array.isArray(sentences) || sentences.length === 0) {
    return;
  }

  const deleteOld = db.prepare(
    'DELETE FROM example_sentences WHERE word_id = ?'
  );
  deleteOld.run(wordId);

  const insert = db.prepare(`
    INSERT INTO example_sentences (word_id, sentence, position)
    VALUES (?, ?, ?)
  `);

  const insertMany = db.transaction((sentences) => {
    for (let i = 0; i < sentences.length; i++) {
      insert.run(wordId, sentences[i], i);
    }
  });

  insertMany(sentences);
}

/**
 * 插入易混淆词
 */
function insertConfusingWords(wordId, confusingWords) {
  if (!Array.isArray(confusingWords) || confusingWords.length === 0) {
    return;
  }

  const deleteOld = db.prepare('DELETE FROM confusing_words WHERE word_id = ?');
  deleteOld.run(wordId);

  const insert = db.prepare(`
    INSERT INTO confusing_words (word_id, confusing_word, core_difference, toeic_scene_focus, position)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((confusingWords) => {
    for (let i = 0; i < confusingWords.length; i++) {
      const cw = confusingWords[i];
      insert.run(
        wordId,
        cw.word,
        cw.coreDifference || null,
        cw.toeicSceneFocus || null,
        i
      );
    }
  });

  insertMany(confusingWords);
}

/**
 * 获取所有分类
 */
function getAllCategories() {
  return db
    .prepare('SELECT id, name, display_name, icon, desc, created_at FROM categories ORDER BY id ASC')
    .all();
}

/**
 * 根据分类获取单词列表（包含所有关联数据）
 */
function getWordsByCategory(categoryName, limit = null, offset = 0) {
  const query = `
    SELECT 
      w.*,
      c.name as category_name
    FROM words w
    JOIN categories c ON w.category_id = c.id
    WHERE c.name = ?
    ORDER BY w.id
    ${limit ? `LIMIT ${limit} OFFSET ${offset}` : ''}
  `;

  const words = db.prepare(query).all(categoryName);

  if (words.length === 0) {
    return [];
  }

  // 获取所有单词ID
  const wordIds = words.map((w) => w.id);

  // 批量获取关键搭配
  const collocationsMap = new Map();
  const collocationsPlaceholders = wordIds.map(() => '?').join(',');
  const collocations = db
    .prepare(
      `
      SELECT word_id, collocation
      FROM key_collocations
      WHERE word_id IN (${collocationsPlaceholders})
      ORDER BY word_id, position
    `
    )
    .all(...wordIds);

  collocations.forEach((c) => {
    if (!collocationsMap.has(c.word_id)) {
      collocationsMap.set(c.word_id, []);
    }
    collocationsMap.get(c.word_id).push(c.collocation);
  });

  // 批量获取例句
  const sentencesMap = new Map();
  const sentences = db
    .prepare(
      `
      SELECT word_id, sentence
      FROM example_sentences
      WHERE word_id IN (${collocationsPlaceholders})
      ORDER BY word_id, position
    `
    )
    .all(...wordIds);

  sentences.forEach((s) => {
    if (!sentencesMap.has(s.word_id)) {
      sentencesMap.set(s.word_id, []);
    }
    sentencesMap.get(s.word_id).push(s.sentence);
  });

  // 批量获取易混淆词
  const confusingWordsMap = new Map();
  const confusingWords = db
    .prepare(
      `
      SELECT word_id, confusing_word, core_difference, toeic_scene_focus
      FROM confusing_words
      WHERE word_id IN (${collocationsPlaceholders})
      ORDER BY word_id, position
    `
    )
    .all(...wordIds);

  confusingWords.forEach((cw) => {
    if (!confusingWordsMap.has(cw.word_id)) {
      confusingWordsMap.set(cw.word_id, []);
    }
    confusingWordsMap.get(cw.word_id).push({
      word: cw.confusing_word,
      coreDifference: cw.core_difference,
      toeicSceneFocus: cw.toeic_scene_focus,
    });
  });

  // 组装数据
  return words.map((word) => ({
    ...word,
    keyCollocations: collocationsMap.get(word.id) || [],
    toeicExampleSentences: sentencesMap.get(word.id) || [],
    confusingWordsComparison: confusingWordsMap.get(word.id) || [],
  }));
}

/**
 * 根据分类获取单词数量
 */
function getWordCountByCategory(categoryName) {
  const result = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM words w
    JOIN categories c ON w.category_id = c.id
    WHERE c.name = ?
  `
    )
    .get(categoryName);

  return result ? result.count : 0;
}

/**
 * 获取单词详情（包含所有关联数据）
 */
function getWordDetail(wordId) {
  const word = db
    .prepare(
      `
    SELECT 
      w.*,
      c.name as category_name
    FROM words w
    JOIN categories c ON w.category_id = c.id
    WHERE w.id = ?
  `
    )
    .get(wordId);

  if (!word) {
    return null;
  }

  // 获取关键搭配
  const collocations = db
    .prepare(
      `
    SELECT collocation
    FROM key_collocations
    WHERE word_id = ?
    ORDER BY position
  `
    )
    .all(wordId);

  // 获取例句
  const sentences = db
    .prepare(
      `
    SELECT sentence
    FROM example_sentences
    WHERE word_id = ?
    ORDER BY position
  `
    )
    .all(wordId);

  // 获取易混淆词
  const confusingWords = db
    .prepare(
      `
    SELECT confusing_word, core_difference, toeic_scene_focus
    FROM confusing_words
    WHERE word_id = ?
    ORDER BY position
  `
    )
    .all(wordId);

  return {
    ...word,
    keyCollocations: collocations.map((c) => c.collocation),
    toeicExampleSentences: sentences.map((s) => s.sentence),
    confusingWordsComparison: confusingWords.map((cw) => ({
      word: cw.confusing_word,
      coreDifference: cw.core_difference,
      toeicSceneFocus: cw.toeic_scene_focus,
    })),
  };
}

/**
 * 根据单词文本获取单词详情（不依赖分类）
 * 如果存在多个相同单词，返回第一个匹配的
 */
function getWordByWord(wordText) {
  const word = db
    .prepare(
      `
    SELECT w.*
    FROM words w
    WHERE LOWER(w.word) = LOWER(?)
    LIMIT 1
  `
    )
    .get(wordText);

  if (!word) {
    return null;
  }

  return getWordDetail(word.id);
}

/**
 * 搜索单词
 */
function searchWords(query, limit = 50) {
  const searchTerm = `%${query}%`;
  const words = db
    .prepare(
      `
    SELECT 
      w.id,
      w.word,
      w.phonetic,
      w.part_of_speech,
      w.core_meaning,
      c.name as category_name
    FROM words w
    JOIN categories c ON w.category_id = c.id
    WHERE w.word LIKE ? OR w.core_meaning LIKE ?
    ORDER BY w.word
    LIMIT ?
  `
    )
    .all(searchTerm, searchTerm, limit);

  return words;
}

/**
 * 批量导入单词
 * @param {string} categoryName - 分类名称
 * @param {Array} wordsData - 单词数据数组
 * @returns {Object} 导入结果 { successCount, failedCount, failedWords }
 */
function batchImportWords(categoryName, wordsData) {
  if (!Array.isArray(wordsData) || wordsData.length === 0) {
    throw new Error('单词数据必须是非空数组');
  }

  // 获取或创建分类
  const category = getOrCreateCategory(categoryName);
  const categoryId = category.id;

  const result = {
    successCount: 0,
    failedCount: 0,
    failedWords: [],
  };

  // 使用事务批量导入
  const importTransaction = db.transaction((wordsData) => {
    for (const wordData of wordsData) {
      try {
        // 验证必需字段
        if (!wordData.word || typeof wordData.word !== 'string' || wordData.word.trim() === '') {
          result.failedCount++;
          result.failedWords.push({
            word: wordData.word || '(未知)',
            error: '单词字段是必需的且必须是非空字符串',
          });
          continue;
        }

        // 插入单词基本信息
        const wordId = insertWord(categoryId, {
          word: wordData.word.trim(),
          phonetic: wordData.phonetic,
          partOfSpeech: wordData.partOfSpeech,
          coreMeaning: wordData.coreMeaning,
          toeicSceneFocus: wordData.toeicSceneFocus,
          sceneAssociation: wordData.sceneAssociation,
          phrase: wordData.phrase,
        });

        // 插入关键搭配
        if (wordData.keyCollocations && Array.isArray(wordData.keyCollocations)) {
          insertCollocations(wordId, wordData.keyCollocations);
        }

        // 插入例句
        if (wordData.toeicExampleSentences && Array.isArray(wordData.toeicExampleSentences)) {
          insertExampleSentences(wordId, wordData.toeicExampleSentences);
        }

        // 插入易混淆词
        if (wordData.confusingWordsComparison && Array.isArray(wordData.confusingWordsComparison)) {
          insertConfusingWords(wordId, wordData.confusingWordsComparison);
        }

        result.successCount++;
      } catch (error) {
        result.failedCount++;
        result.failedWords.push({
          word: wordData.word || '(未知)',
          error: error.message || '导入失败',
        });
        console.error(`导入单词 "${wordData.word}" 失败:`, error);
      }
    }
  });

  // 执行事务
  importTransaction(wordsData);

  return result;
}

/**
 * 根据多个分类获取单词列表
 * @param {Array<string>} categoryNames - 分类名称数组
 */
function getWordsByCategories(categoryNames) {
  if (!Array.isArray(categoryNames) || categoryNames.length === 0) {
    return [];
  }

  // 构建查询，使用 IN 子句
  const placeholders = categoryNames.map(() => '?').join(',');
  const query = `
    SELECT 
      w.*,
      c.name as category_name
    FROM words w
    JOIN categories c ON w.category_id = c.id
    WHERE c.name IN (${placeholders})
    ORDER BY w.id
  `;

  return db.prepare(query).all(...categoryNames);
}

/**
 * 保存文章
 * @param {string} title - 文章标题
 * @param {string} content - 文章内容
 * @param {Array<string>} categories - 分类数组
 */
function saveArticle(title, content, categories) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new Error('文章标题是必需的');
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    throw new Error('文章内容是必需的');
  }
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error('分类数组是必需的且不能为空');
  }

  const insert = db.prepare(
    'INSERT INTO articles (title, content, categories) VALUES (?, ?, ?)'
  );
  const result = insert.run(title.trim(), content.trim(), JSON.stringify(categories));
  
  return {
    id: result.lastInsertRowid,
    title: title.trim(),
    content: content.trim(),
    categories,
    created_at: new Date().toISOString(),
  };
}

/**
 * 获取所有文章列表
 */
function getAllArticles() {
  const articles = db
    .prepare('SELECT id, title, categories, created_at FROM articles ORDER BY created_at DESC')
    .all();
  
  return articles.map(article => ({
    ...article,
    categories: JSON.parse(article.categories),
  }));
}

/**
 * 根据ID获取文章详情
 * @param {number} articleId - 文章ID
 */
function getArticleById(articleId) {
  const article = db
    .prepare('SELECT * FROM articles WHERE id = ?')
    .get(articleId);
  
  if (!article) {
    return null;
  }

  return {
    ...article,
    categories: JSON.parse(article.categories),
  };
}

/**
 * 删除文章
 * @param {number} articleId - 文章ID
 */
function deleteArticle(articleId) {
  const result = db
    .prepare('DELETE FROM articles WHERE id = ?')
    .run(articleId);
  
  return result.changes > 0;
}

/**
 * 保存笔记
 * @param {number} articleId - 文章ID
 * @param {string} title - 笔记标题（在同一文章内唯一，不重复）
 * @param {string} content - 笔记内容
 * @param {string} type - 笔记类型：'单词' 或 '短语'
 */
function saveNote(articleId, title, content, type) {
  if (!articleId || typeof articleId !== 'number' || articleId <= 0) {
    throw new Error('文章ID是必需的且必须是正整数');
  }
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new Error('笔记标题是必需的');
  }
  if (!content || typeof content !== 'string' || content.trim() === '') {
    throw new Error('笔记内容是必需的');
  }
  if (!type) {
    throw new Error('笔记类型必须是"单词"或"短语"');
  }

  // 验证文章是否存在
  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(articleId);
  if (!article) {
    throw new Error('指定的文章不存在');
  }

  // 检查在该文章下标题是否已存在
  const existing = db
    .prepare('SELECT id FROM notes WHERE article_id = ? AND title = ?')
    .get(articleId, title.trim());

  if (existing) {
    throw new Error('该文章下已存在相同标题的笔记');
  }

  const insert = db.prepare(
    'INSERT INTO notes (article_id, title, content, type) VALUES (?, ?, ?, ?)'
  );
  const result = insert.run(articleId, title.trim(), content.trim(), type);
  
  return {
    id: result.lastInsertRowid,
    article_id: articleId,
    title: title.trim(),
    content: content.trim(),
    type,
    created_at: new Date().toISOString(),
  };
}

/**
 * 获取所有笔记列表
 */
function getAllNotes() {
  const notes = db
    .prepare('SELECT id, title, type, created_at FROM notes ORDER BY created_at DESC')
    .all();
  
  return notes;
}

/**
 * 根据文章ID获取笔记列表
 * @param {number} articleId - 文章ID
 */
function getNotesByArticleId(articleId) {
  if (!articleId || typeof articleId !== 'number' || articleId <= 0) {
    throw new Error('文章ID是必需的且必须是正整数');
  }

  const notes = db
    .prepare('SELECT id, article_id, title, content, type, created_at FROM notes WHERE article_id = ? ORDER BY created_at DESC')
    .all(articleId);
  
  return notes;
}

/**
 * 根据ID获取笔记详情
 * @param {number} noteId - 笔记ID
 */
function getNoteById(noteId) {
  const note = db
    .prepare('SELECT * FROM notes WHERE id = ?')
    .get(noteId);
  
  if (!note) {
    return null;
  }
  
  return note;
}

/**
 * 删除笔记
 * @param {number} noteId - 笔记ID
 */
function deleteNote(noteId) {
  const result = db
    .prepare('DELETE FROM notes WHERE id = ?')
    .run(noteId);
  
  return result.changes > 0;
}

// 初始化数据库
initDatabase();

module.exports = {
  db,
  initDatabase,
  migrateDatabase,
  getOrCreateCategory,
  createCategory,
  insertWord,
  insertCollocations,
  insertExampleSentences,
  insertConfusingWords,
  getAllCategories,
  getWordsByCategory,
  getWordsByCategories,
  getWordCountByCategory,
  getWordDetail,
  getWordByWord,
  searchWords,
  batchImportWords,
  saveArticle,
  getAllArticles,
  getArticleById,
  deleteArticle,
  saveNote,
  getAllNotes,
  getNotesByArticleId,
  getNoteById,
  deleteNote,
};
