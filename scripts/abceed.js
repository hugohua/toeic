const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// 数据库路径
const dbPath = path.join(__dirname, '../data', 'words.db');
const db = new Database(dbPath);

// 输入JSON文件路径
const jsonFilePath = path.join(__dirname, 'abceed.json');

// 输出文件路径
const outputFilePath = path.join(__dirname, 'missing_words.txt');

/**
 * 从JSON文件中提取所有单词
 */
function extractWordsFromJson(jsonData) {
  const words = new Set(); // 使用Set去重
  
  if (!jsonData || !jsonData.pos_list) {
    console.error('JSON文件格式错误：缺少 pos_list 字段');
    return words;
  }
  
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
      
      // 遍历 word_list
      for (const wordItem of levelItem.word_list) {
        if (wordItem.word && typeof wordItem.word === 'string') {
          const word = wordItem.word.trim();
          if (word) {
            words.add(word);
          }
        }
      }
    }
  }
  
  return words;
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
  
  // 2. 提取所有单词
  console.log('正在提取单词...');
  const allWords = extractWordsFromJson(jsonData);
  console.log(`✓ 提取到 ${allWords.size} 个唯一单词\n`);
  
  // 3. 检查每个单词是否存在于数据库
  console.log('正在检查数据库中是否存在这些单词...');
  const missingWords = [];
  let checkedCount = 0;
  const totalWords = allWords.size;
  
  for (const word of allWords) {
    checkedCount++;
    
    if (!checkWordExists(word)) {
      missingWords.push(word);
    }
    
    // 每检查1000个单词输出一次进度
    if (checkedCount % 1000 === 0) {
      console.log(`  已检查: ${checkedCount}/${totalWords} (找到 ${missingWords.length} 个缺失单词)`);
    }
  }
  
  console.log(`✓ 检查完成，共找到 ${missingWords.length} 个不存在的单词\n`);
  
  // 4. 保存不存在的单词到文件
  if (missingWords.length > 0) {
    console.log(`正在保存到文件: ${outputFilePath}`);
    
    // 按字母顺序排序
    missingWords.sort();
    
    // 写入文件（每行一个单词）
    const content = missingWords.join('\n') + '\n';
    try {
      fs.writeFileSync(outputFilePath, content, 'utf-8');
      console.log(`✓ 成功保存 ${missingWords.length} 个单词到文件\n`);
    } catch (error) {
      console.error('✗ 保存文件失败:', error.message);
      process.exit(1);
    }
  } else {
    console.log('所有单词都已在数据库中，无需保存文件\n');
  }
  
  // 5. 输出统计信息
  console.log('=================================');
  console.log('处理完成！');
  console.log(`总单词数: ${totalWords}`);
  console.log(`数据库中存在的单词: ${totalWords - missingWords.length}`);
  console.log(`数据库中不存在的单词: ${missingWords.length}`);
  console.log('=================================');
  
  // 关闭数据库连接
  db.close();
}

// 运行主函数
main();

