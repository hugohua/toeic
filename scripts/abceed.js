/**
 * Abceed 单词数据提取和检查脚本
 * 
 * 功能说明：
 * 1. 从 abceed.json 文件中提取所有单词及其短语信息
 * 2. 检查这些单词是否已存在于数据库中（words.db）
 * 3. 将数据库中不存在的单词保存到 missing_words.json 文件
 * 
 * 输入文件：
 * - scripts/abceed.json: Abceed 单词数据源文件（包含 pos_list、level_list、word_list 等结构）
 * 
 * 输出文件：
 * - scripts/missing_words.json: 数据库中不存在的单词列表（JSON格式）
 *   格式: [{ word: "单词", phrase: "短语", level: 级别 }, ...]
 * 
 * 数据库：
 * - data/words.db: 单词数据库，用于检查单词是否存在
 * 
 * 使用方法：
 *   node scripts/abceed.js
 * 
 * 处理逻辑：
 * - 只处理单个单词（过滤掉包含空格的短语）
 * - 优先从 base_ref_phrase_list 中查找包含该单词的短语
 * - 如果未找到，则从 reference_list 中查找
 * - 只保留有短语的单词（无短语的单词会被跳过）
 * - 对重复单词进行去重（保留第一个遇到的）
 * - 最终结果按单词字母顺序排序
 * 
 * 输出统计：
 * - 总单词数
 * - 数据库中存在的单词数
 * - 数据库中不存在的单词数
 * - 有短语/无短语的单词统计
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 数据库路径
const dbPath = path.join(__dirname, '../data', 'words.db');
const db = new Database(dbPath);

// 输入JSON文件路径
const jsonFilePath = path.join(__dirname, 'abceed.json');

// 输出文件路径（改为JSON格式）
const outputFilePath = path.join(__dirname, 'missing_words.json');

/**
 * 在短语数组中查找包含指定单词的第一个短语（不区分大小写）
 */
function findPhraseContainingWord(phraseList, word) {
  if (!Array.isArray(phraseList)) {
    return null;
  }
  
  const wordLower = word.toLowerCase();
  
  for (const phrase of phraseList) {
    if (typeof phrase === 'string') {
      // 使用单词边界来匹配，避免部分匹配（如 "air" 匹配 "chair"）
      const regex = new RegExp(`\\b${wordLower}\\b`, 'i');
      if (regex.test(phrase)) {
        return phrase;
      }
    }
  }
  
  return null;
}

/**
 * 从JSON文件中提取所有单词及其短语信息
 */
function extractWordsWithPhrases(jsonData) {
  const wordMap = new Map(); // 使用Map存储单词信息，key为单词（小写），value为{word, phrase, wordItem}
  
  if (!jsonData || !jsonData.pos_list) {
    console.error('JSON文件格式错误：缺少 pos_list 字段');
    return wordMap;
  }
  
  const baseRefPhraseList = jsonData.base_ref_phrase_list || [];
  
  // 遍历 pos_list
  for (const posItem of jsonData.pos_list) {
    if (!posItem.level_list || !Array.isArray(posItem.level_list)) {
      continue;
    }
    
    // 遍历 level_list
    for (const levelItem of posItem.level_list) {
      if (!levelItem.word_list || !Array.isArray(levelItem.word_list)) {
        continue;
      }
      
      // 获取当前level
      const level = levelItem.level;
      
      // 遍历 word_list
      for (const wordItem of levelItem.word_list) {
        if (wordItem.word && typeof wordItem.word === 'string') {
          const word = wordItem.word.trim();
          if (!word) {
            continue;
          }
          
          // 只保留单个单词，移除包含空格的短语、短句类
          if (word.includes(' ')) {
            continue;
          }
          
          const wordLower = word.toLowerCase();
          
          // 如果这个单词已经处理过，跳过（保留第一个遇到的）
          if (wordMap.has(wordLower)) {
            continue;
          }
          
          let phrase = null;
          
          // 优先从 base_ref_phrase_list 中获取短语
          phrase = findPhraseContainingWord(baseRefPhraseList, word);
          
          // 如果从 base_ref_phrase_list 没有找到，再从 reference_list 中获取
          if (!phrase && wordItem.reference_list && Array.isArray(wordItem.reference_list) && wordItem.reference_list.length > 0) {
            const firstRef = wordItem.reference_list[0];
            if (typeof firstRef.ref_phrase_num === 'number' && firstRef.ref_phrase_num >= 0) {
              const phraseIndex = firstRef.ref_phrase_num;
              if (phraseIndex < baseRefPhraseList.length) {
                const candidatePhrase = baseRefPhraseList[phraseIndex];
                // 检查短语是否包含该单词
                if (candidatePhrase && typeof candidatePhrase === 'string') {
                  const regex = new RegExp(`\\b${wordLower}\\b`, 'i');
                  if (regex.test(candidatePhrase)) {
                    phrase = candidatePhrase;
                  }
                }
              }
            }
          }
          
          // 若均无 phrase，则移除该单词（不添加到 wordMap）
          if (!phrase) {
            continue;
          }
          
          wordMap.set(wordLower, {
            word: word,
            phrase: phrase,
            level: level, // 添加level字段
            wordItem: wordItem
          });
        }
      }
    }
  }
  
  return wordMap;
}

/**
 * 检查单词是否在数据库中存在
 */
function checkWordExists(word) {
  const result = db
    .prepare('SELECT id FROM words WHERE LOWER(word) = LOWER(?) LIMIT 1')
    .get(word);
  
  return !!result;
}

/**
 * 主函数
 */
function main() {
  console.log('开始处理...\n');
  
  // 1. 读取JSON文件
  console.log(`正在读取文件: ${jsonFilePath}`);
  let jsonData;
  try {
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    jsonData = JSON.parse(jsonContent);
    console.log('✓ JSON文件读取成功\n');
  } catch (error) {
    console.error('✗ 读取JSON文件失败:', error.message);
    process.exit(1);
  }
  
  // 2. 提取所有单词及短语信息
  console.log('正在提取单词和短语信息...');
  const wordMap = extractWordsWithPhrases(jsonData);
  console.log(`✓ 提取到 ${wordMap.size} 个唯一单词\n`);
  
  // 3. 检查每个单词是否存在于数据库
  console.log('正在检查数据库中是否存在这些单词...');
  const missingWords = [];
  let checkedCount = 0;
  const totalWords = wordMap.size;
  
  for (const [wordLower, wordInfo] of wordMap) {
    checkedCount++;
    
    if (!checkWordExists(wordInfo.word)) {
      missingWords.push({
        word: wordInfo.word,
        phrase: wordInfo.phrase,
        level: wordInfo.level
      });
    }
    
    // 每检查1000个单词输出一次进度
    if (checkedCount % 1000 === 0) {
      console.log(`  已检查: ${checkedCount}/${totalWords} (找到 ${missingWords.length} 个缺失单词)`);
    }
  }
  
  console.log(`✓ 检查完成，共找到 ${missingWords.length} 个不存在的单词\n`);
  
  // 4. 按单词字母顺序排序
  missingWords.sort((a, b) => a.word.localeCompare(b.word));
  
  // 5. 保存不存在的单词到JSON文件
  if (missingWords.length > 0) {
    console.log(`正在保存到文件: ${outputFilePath}`);
    
    try {
      const jsonContent = JSON.stringify(missingWords, null, 2);
      fs.writeFileSync(outputFilePath, jsonContent, 'utf-8');
      console.log(`✓ 成功保存 ${missingWords.length} 个单词到JSON文件\n`);
    } catch (error) {
      console.error('✗ 保存文件失败:', error.message);
      process.exit(1);
    }
  } else {
    console.log('所有单词都已在数据库中，无需保存文件\n');
  }
  
  // 6. 输出统计信息
  const wordsWithPhrase = missingWords.filter(item => item.phrase && item.phrase.trim() !== '').length;
  const wordsWithoutPhrase = missingWords.length - wordsWithPhrase;
  
  console.log('=================================');
  console.log('处理完成！');
  console.log(`总单词数: ${totalWords}`);
  console.log(`数据库中存在的单词: ${totalWords - missingWords.length}`);
  console.log(`数据库中不存在的单词: ${missingWords.length}`);
  console.log(`  - 有短语的单词: ${wordsWithPhrase}`);
  console.log(`  - 无短语的单词: ${wordsWithoutPhrase}`);
  console.log('=================================');
  
  // 关闭数据库连接
  db.close();
}

// 运行主函数
main();
