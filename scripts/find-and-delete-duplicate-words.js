/**
 * 查找并删除数据库中的重复单词记录脚本
 * 
 * 功能说明：
 * 1. 扫描 words 数据库表，查找所有重复的单词（不区分大小写）
 * 2. 对于每个重复单词，列出所有出现该单词的记录详情，包括：
 *    - 单词ID、单词文本
 *    - 所属分类（分类ID、分类名称、显示名称）
 *    - 音标、词性、核心含义
 *    - 创建时间
 * 3. 生成详细的重复单词查找报告
 * 4. 在执行删除操作前，自动备份数据库文件到 scripts/backups/ 目录
 * 5. 对于每个重复单词，保留 ID 最小的记录（最早创建的记录），删除其他所有重复记录
 * 6. 自动删除关联数据（由于外键约束 ON DELETE CASCADE）：
 *    - key_collocations（关键搭配）
 *    - example_sentences（例句）
 *    - confusing_words（易混淆词）
 * 7. 生成详细的删除报告，包含所有删除记录的统计信息
 * 
 * 使用方法：
 *   node scripts/find-and-delete-duplicate-words.js
 * 
 * 输出文件：
 *   scripts/duplicate_words.txt - 包含所有重复单词的详细查找报告
 *   scripts/deleted_duplicate_words.txt - 包含所有删除记录的详细报告
 * 
 * 输出内容包括：
 *   查找报告：
 *   - 重复单词列表（按出现次数降序排列）
 *   - 每个重复单词的所有记录详情
 *   - 统计信息（重复单词数量、重复记录总数、可删除记录数）
 * 
 *   删除报告：
 *   - 按单词分组的删除记录列表
 *   - 每个删除记录的详细信息（ID、单词、分类、创建时间）
 *   - 每个删除记录关联的数据统计（关键搭配、例句、易混淆词数量）
 *   - 删除统计信息（删除的单词记录数、关联数据数、总计）
 * 
 * 删除策略：
 *   - 对于每个重复单词，保留 ID 最小的记录（即最早创建的记录）
 *   - 删除其他所有重复记录
 *   - 由于外键约束设置了 ON DELETE CASCADE，删除单词记录时会自动删除关联表中的相关数据
 * 
 * 注意事项：
 *   ⚠️  此脚本会直接修改数据库，删除操作不可逆！
 *   - 脚本会在删除操作前自动备份数据库到 scripts/backups/ 目录
 *   - 备份文件名格式：words.db.backup.YYYY-MM-DDTHH-MM-SS
 *   - 如果备份失败，脚本将终止执行以确保数据安全
 *   - 脚本使用事务确保删除操作的原子性
 *   - 数据库文件路径：data/words.db
 *   - 确保数据库外键约束已启用（脚本会自动启用）
 *   - 重复判断基于单词文本（不区分大小写）
 * 
 * 示例：
 *   如果单词 "program" 在数据库中出现 7 次（ID: 210, 422, 565, 677, 1181, 1438, 1562）
 *   脚本会保留 ID 210 的记录，删除其他 6 条记录及其关联数据
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// 数据库文件路径
const dbPath = path.join(__dirname, '../data', 'words.db');

// 输出文件路径
const findReportPath = path.join(__dirname, 'duplicate_words.txt');
const deleteReportPath = path.join(__dirname, 'deleted_duplicate_words.txt');

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
  console.error(`错误: 数据库文件不存在: ${dbPath}`);
  process.exit(1);
}

// 创建数据库连接
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

try {
  console.log('==========================================');
  console.log('开始查找并删除重复单词记录');
  console.log('==========================================\n');

  // ==================== 第一步：查找重复单词 ====================
  console.log('【第一步】正在查找重复单词...\n');

  // 查询所有单词，按单词文本（不区分大小写）分组，找出出现次数大于1的
  const duplicateWordsQuery = `
    SELECT 
      LOWER(w.word) as word_lower,
      COUNT(*) as count
    FROM words w
    GROUP BY LOWER(w.word)
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, LOWER(w.word)
  `;

  const duplicateWords = db.prepare(duplicateWordsQuery).all();

  if (duplicateWords.length === 0) {
    console.log('✓ 未发现重复单词！');
    fs.writeFileSync(findReportPath, '未发现重复单词。\n', 'utf-8');
    console.log(`结果已保存到: ${findReportPath}`);
    console.log('\n脚本执行完成，无需删除操作。');
    process.exit(0);
  }

  const totalDuplicateRecords = duplicateWords.reduce((sum, d) => sum + d.count, 0);
  const recordsToDeleteCount = duplicateWords.reduce((sum, d) => sum + (d.count - 1), 0);

  console.log(`发现 ${duplicateWords.length} 个重复单词（总计 ${totalDuplicateRecords} 条记录）`);
  console.log(`预计将删除 ${recordsToDeleteCount} 条重复记录\n`);

  // 对于每个重复单词，查询详细信息
  const wordDetailQuery = `
    SELECT 
      w.id,
      w.word,
      w.category_id,
      c.name as category_name,
      c.display_name as category_display_name,
      w.phonetic,
      w.part_of_speech,
      w.core_meaning,
      w.created_at
    FROM words w
    JOIN categories c ON w.category_id = c.id
    WHERE LOWER(w.word) = ?
    ORDER BY w.id
  `;

  const getWordDetails = db.prepare(wordDetailQuery);

  // 构建查找报告内容
  let findReport = '';
  findReport += `重复单词查找报告\n`;
  findReport += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
  findReport += `==========================================\n\n`;
  findReport += `发现 ${duplicateWords.length} 个重复单词（总计 ${totalDuplicateRecords} 条记录）\n`;
  findReport += `可删除记录数: ${recordsToDeleteCount}\n\n`;

  let index = 1;
  for (const dup of duplicateWords) {
    const wordLower = dup.word_lower;
    const count = dup.count;

    const details = getWordDetails.all(wordLower);

    findReport += `${index}. "${wordLower}" (出现 ${count} 次)\n`;
    findReport += `${'='.repeat(60)}\n`;

    details.forEach((detail, idx) => {
      findReport += `   记录 ${idx + 1}:\n`;
      findReport += `   - ID: ${detail.id}\n`;
      findReport += `   - 单词: ${detail.word}\n`;
      findReport += `   - 分类ID: ${detail.category_id}\n`;
      findReport += `   - 分类名称: ${detail.category_name}`;
      if (detail.category_display_name) {
        findReport += ` (${detail.category_display_name})`;
      }
      findReport += `\n`;
      if (detail.phonetic) {
        findReport += `   - 音标: ${detail.phonetic}\n`;
      }
      if (detail.part_of_speech) {
        findReport += `   - 词性: ${detail.part_of_speech}\n`;
      }
      if (detail.core_meaning) {
        // 截断过长的含义
        const meaning = detail.core_meaning.length > 100 
          ? detail.core_meaning.substring(0, 100) + '...' 
          : detail.core_meaning;
        findReport += `   - 核心含义: ${meaning}\n`;
      }
      findReport += `   - 创建时间: ${detail.created_at}\n`;
      if (idx < details.length - 1) {
        findReport += `\n`;
      }
    });

    findReport += `\n\n`;
    index++;
  }

  // 添加统计信息到查找报告
  findReport += `==========================================\n`;
  findReport += `统计信息:\n`;
  findReport += `- 重复单词数量: ${duplicateWords.length}\n`;
  findReport += `- 重复记录总数: ${totalDuplicateRecords}\n`;
  findReport += `- 可删除记录数: ${recordsToDeleteCount}\n`;

  // 写入查找报告文件
  fs.writeFileSync(findReportPath, findReport, 'utf-8');

  console.log(`✓ 重复单词查找完成！`);
  console.log(`查找报告已保存到: ${findReportPath}`);
  console.log(`\n统计信息:`);
  console.log(`- 重复单词数量: ${duplicateWords.length}`);
  console.log(`- 重复记录总数: ${totalDuplicateRecords}`);
  console.log(`- 可删除记录数: ${recordsToDeleteCount}\n`);

  // ==================== 第二步：备份数据库 ====================
  console.log('【第二步】正在备份数据库...\n');

  // 创建备份目录（如果不存在）
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 生成带时间戳的备份文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFileName = `words.db.backup.${timestamp}`;
  const backupPath = path.join(backupDir, backupFileName);

  try {
    // 复制数据库文件
    fs.copyFileSync(dbPath, backupPath);
    
    // 获取备份文件大小
    const backupStats = fs.statSync(backupPath);
    const backupSizeMB = (backupStats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✓ 数据库备份成功！`);
    console.log(`备份文件: ${backupPath}`);
    console.log(`备份大小: ${backupSizeMB} MB\n`);
  } catch (error) {
    console.error(`✗ 数据库备份失败: ${error.message}`);
    console.error('为了安全起见，脚本将终止执行。');
    process.exit(1);
  }

  // ==================== 第三步：删除重复单词 ====================
  console.log('【第三步】开始删除重复单词记录...\n');

  // 查询所有重复单词，找出需要删除的记录
  // 对于每个重复单词，保留ID最小的记录，删除其他记录
  const findDuplicatesQuery = `
    SELECT 
      LOWER(w.word) as word_lower,
      w.id,
      w.word,
      w.category_id,
      c.name as category_name,
      c.display_name as category_display_name,
      w.created_at,
      ROW_NUMBER() OVER (PARTITION BY LOWER(w.word) ORDER BY w.id) as rn
    FROM words w
    JOIN categories c ON w.category_id = c.id
    WHERE LOWER(w.word) IN (
      SELECT LOWER(word)
      FROM words
      GROUP BY LOWER(word)
      HAVING COUNT(*) > 1
    )
    ORDER BY LOWER(w.word), w.id
  `;

  const allRecords = db.prepare(findDuplicatesQuery).all();
  
  // 筛选出需要删除的记录（rn > 1 的记录）
  const recordsToDelete = allRecords.filter(r => r.rn > 1);

  if (recordsToDelete.length === 0) {
    console.log('✓ 未发现需要删除的重复记录！');
    fs.writeFileSync(deleteReportPath, '未发现需要删除的重复记录。\n', 'utf-8');
    console.log(`删除报告已保存到: ${deleteReportPath}`);
    console.log('\n脚本执行完成。');
    process.exit(0);
  }

  console.log(`发现 ${recordsToDelete.length} 条需要删除的重复记录\n`);
  console.log('开始删除...\n');

  // 统计每个关联表的删除数量
  const getCollocationCount = db.prepare(`
    SELECT COUNT(*) as count FROM key_collocations WHERE word_id = ?
  `);
  const getSentenceCount = db.prepare(`
    SELECT COUNT(*) as count FROM example_sentences WHERE word_id = ?
  `);
  const getConfusingWordCount = db.prepare(`
    SELECT COUNT(*) as count FROM confusing_words WHERE word_id = ?
  `);

  // 准备删除语句
  const deleteWord = db.prepare('DELETE FROM words WHERE id = ?');

  // 构建删除报告
  let deleteReport = '';
  deleteReport += `重复单词删除报告\n`;
  deleteReport += `删除时间: ${new Date().toLocaleString('zh-CN')}\n`;
  deleteReport += `==========================================\n\n`;
  deleteReport += `数据库备份文件: ${backupPath}\n`;
  deleteReport += `共删除 ${recordsToDelete.length} 条重复单词记录\n\n`;

  // 按单词分组，便于报告
  const deletedByWord = new Map();
  let totalCollocationsDeleted = 0;
  let totalSentencesDeleted = 0;
  let totalConfusingWordsDeleted = 0;

  // 使用事务执行删除操作
  const deleteTransaction = db.transaction((records) => {
    for (const record of records) {
      const wordId = record.id;
      const wordLower = record.word_lower;

      // 统计关联数据
      const collocationCount = getCollocationCount.get(wordId)?.count || 0;
      const sentenceCount = getSentenceCount.get(wordId)?.count || 0;
      const confusingWordCount = getConfusingWordCount.get(wordId)?.count || 0;

      // 删除单词记录（关联数据会自动删除）
      deleteWord.run(wordId);

      // 记录删除信息
      if (!deletedByWord.has(wordLower)) {
        deletedByWord.set(wordLower, []);
      }
      deletedByWord.get(wordLower).push({
        id: wordId,
        word: record.word,
        category_id: record.category_id,
        category_name: record.category_name,
        category_display_name: record.category_display_name,
        created_at: record.created_at,
        collocations: collocationCount,
        sentences: sentenceCount,
        confusingWords: confusingWordCount,
      });

      totalCollocationsDeleted += collocationCount;
      totalSentencesDeleted += sentenceCount;
      totalConfusingWordsDeleted += confusingWordCount;
    }
  });

  // 执行删除事务
  deleteTransaction(recordsToDelete);

  // 生成详细删除报告
  let deleteIndex = 1;
  for (const [wordLower, records] of Array.from(deletedByWord.entries()).sort()) {
    deleteReport += `${deleteIndex}. "${wordLower}" (删除 ${records.length} 条记录)\n`;
    deleteReport += `${'='.repeat(60)}\n`;

    records.forEach((r, idx) => {
      deleteReport += `   删除记录 ${idx + 1}:\n`;
      deleteReport += `   - ID: ${r.id}\n`;
      deleteReport += `   - 单词: ${r.word}\n`;
      deleteReport += `   - 分类: ${r.category_name}`;
      if (r.category_display_name) {
        deleteReport += ` (${r.category_display_name})`;
      }
      deleteReport += `\n`;
      deleteReport += `   - 创建时间: ${r.created_at}\n`;
      deleteReport += `   - 同时删除关联数据: `;
      const parts = [];
      if (r.collocations > 0) parts.push(`${r.collocations} 条关键搭配`);
      if (r.sentences > 0) parts.push(`${r.sentences} 条例句`);
      if (r.confusingWords > 0) parts.push(`${r.confusingWords} 条易混淆词`);
      deleteReport += parts.length > 0 ? parts.join('、') : '无';
      deleteReport += `\n`;
      if (idx < records.length - 1) {
        deleteReport += `\n`;
      }
    });

    deleteReport += `\n\n`;
    deleteIndex++;
  }

  // 添加统计信息到删除报告
  deleteReport += `==========================================\n`;
  deleteReport += `删除统计:\n`;
  deleteReport += `- 删除单词记录数: ${recordsToDelete.length}\n`;
  deleteReport += `- 同时删除关键搭配数: ${totalCollocationsDeleted}\n`;
  deleteReport += `- 同时删除例句数: ${totalSentencesDeleted}\n`;
  deleteReport += `- 同时删除易混淆词数: ${totalConfusingWordsDeleted}\n`;
  deleteReport += `- 总计删除记录数: ${recordsToDelete.length + totalCollocationsDeleted + totalSentencesDeleted + totalConfusingWordsDeleted}\n`;

  // 写入删除报告文件
  fs.writeFileSync(deleteReportPath, deleteReport, 'utf-8');

  console.log(`✓ 删除完成！`);
  console.log(`删除报告已保存到: ${deleteReportPath}`);
  console.log(`\n删除统计:`);
  console.log(`- 删除单词记录数: ${recordsToDelete.length}`);
  console.log(`- 同时删除关键搭配数: ${totalCollocationsDeleted}`);
  console.log(`- 同时删除例句数: ${totalSentencesDeleted}`);
  console.log(`- 同时删除易混淆词数: ${totalConfusingWordsDeleted}`);
  console.log(`- 总计删除记录数: ${recordsToDelete.length + totalCollocationsDeleted + totalSentencesDeleted + totalConfusingWordsDeleted}`);
  console.log(`\n数据库备份文件: ${backupPath}`);

  console.log('\n==========================================');
  console.log('脚本执行完成！');
  console.log('==========================================');
} catch (error) {
  console.error('处理重复单词时出错:', error);
  process.exit(1);
} finally {
  // 关闭数据库连接
  db.close();
}

