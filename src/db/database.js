const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, '../../data', 'words.db');

// 创建数据库连接
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

/**
 * 数据库迁移：添加 display_name 字段
 */
function migrateDatabase() {
  try {
    // 检查是否存在 display_name 字段
    const tableInfo = db.pragma('table_info(categories)');
    const hasDisplayName = tableInfo.some((col) => col.name === 'display_name');

    if (!hasDisplayName) {
      console.log('正在迁移数据库：添加 display_name 字段...');
      db.exec('ALTER TABLE categories ADD COLUMN display_name TEXT');
      console.log('数据库迁移完成：display_name 字段已添加');
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

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_words_category ON words(category_id);
    CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
    CREATE INDEX IF NOT EXISTS idx_collocations_word ON key_collocations(word_id);
    CREATE INDEX IF NOT EXISTS idx_sentences_word ON example_sentences(word_id);
    CREATE INDEX IF NOT EXISTS idx_confusing_word ON confusing_words(word_id);
  `);
}

/**
 * 获取或创建分类
 */
function getOrCreateCategory(categoryName, displayName = null) {
  let category = db
    .prepare('SELECT id FROM categories WHERE name = ?')
    .get(categoryName);

  if (!category) {
    const insert = db.prepare(
      'INSERT INTO categories (name, display_name) VALUES (?, ?)'
    );
    const result = insert.run(categoryName, displayName);
    return { id: result.lastInsertRowid };
  }

  return category;
}

/**
 * 创建分类
 */
function createCategory(categoryName, displayName) {
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
    'INSERT INTO categories (name, display_name) VALUES (?, ?)'
  );
  const result = insert.run(categoryName.trim(), displayName || null);
  
  return {
    id: result.lastInsertRowid,
    name: categoryName.trim(),
    display_name: displayName || null,
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
    .prepare('SELECT id, name, display_name, created_at FROM categories ORDER BY name')
    .all();
}

/**
 * 根据分类获取单词列表
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

  return db.prepare(query).all(categoryName);
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
 * 根据单词和分类获取单词详情
 */
function getWordByWordAndCategory(wordText, categoryName) {
  const word = db
    .prepare(
      `
    SELECT w.*
    FROM words w
    JOIN categories c ON w.category_id = c.id
    WHERE w.word = ? AND c.name = ?
  `
    )
    .get(wordText, categoryName);

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
  getWordCountByCategory,
  getWordDetail,
  getWordByWordAndCategory,
  searchWords,
  batchImportWords,
};
