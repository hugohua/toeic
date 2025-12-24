const path = require('path');
const fs = require('fs');

// 导入数据库操作模块
const {
  getOrCreateCategory,
  insertWord,
  insertCollocations,
  insertExampleSentences,
  insertConfusingWords,
} = require('../src/db/database');

// 读取 data.js 文件
const dataPath = path.join(__dirname, '../src/data.js');
const dataContent = fs.readFileSync(dataPath, 'utf-8');

// 提取 wordData 对象
// 匹配 export const wordData = { ... };
const wordDataMatch = dataContent.match(/export const wordData = ({[\s\S]*});/);
if (!wordDataMatch) {
  console.error('无法解析 data.js 文件');
  process.exit(1);
}

// 将 export const wordData = {...} 转换为 const wordData = {...}
const code = wordDataMatch[1];

// 直接解析对象（使用 Function 构造器，因为数据是可信的）
let wordDataObj;
try {
  wordDataObj = new Function('return ' + code)();
  
  if (!wordDataObj || typeof wordDataObj !== 'object') {
    throw new Error('解析后的数据不是有效对象');
  }
} catch (error) {
  console.error('解析数据文件时出错:', error.message);
  process.exit(1);
}

console.log('开始导入数据到 SQLite 数据库...\n');

let totalWords = 0;
let totalCategories = 0;

// 遍历所有分类
for (const categoryName in wordDataObj) {
  if (!wordDataObj.hasOwnProperty(categoryName)) {
    continue;
  }

  const words = wordDataObj[categoryName];
  if (!Array.isArray(words)) {
    console.warn(`警告: ${categoryName} 不是数组，跳过`);
    continue;
  }

  console.log(`处理分类: ${categoryName} (${words.length} 个单词)`);

  // 获取或创建分类
  const category = getOrCreateCategory(categoryName);
  totalCategories++;

  // 导入每个单词
  for (let i = 0; i < words.length; i++) {
    const wordDataItem = words[i];
    
    if (!wordDataItem || !wordDataItem.word) {
      console.warn(`警告: 跳过无效的单词数据 (索引 ${i})`);
      continue;
    }

    try {
      // 插入单词基本信息
      const wordId = insertWord(category.id, {
        word: wordDataItem.word,
        phonetic: wordDataItem.phonetic,
        partOfSpeech: wordDataItem.partOfSpeech,
        coreMeaning: wordDataItem.coreMeaning,
        toeicSceneFocus: wordDataItem.toeicSceneFocus,
        sceneAssociation: wordDataItem.sceneAssociation,
        phrase: wordDataItem.phrase,
      });

      // 插入关键搭配
      if (wordDataItem.keyCollocations) {
        insertCollocations(wordId, wordDataItem.keyCollocations);
      }

      // 插入例句
      if (wordDataItem.toeicExampleSentences) {
        insertExampleSentences(wordId, wordDataItem.toeicExampleSentences);
      }

      // 插入易混淆词
      if (wordDataItem.confusingWordsComparison) {
        insertConfusingWords(wordId, wordDataItem.confusingWordsComparison);
      }

      totalWords++;

      // 每处理 100 个单词显示一次进度
      if ((i + 1) % 100 === 0) {
        console.log(`  已处理 ${i + 1}/${words.length} 个单词`);
      }
    } catch (error) {
      console.error(`错误: 导入单词 "${wordDataItem.word}" 时出错:`, error.message);
    }
  }

  console.log(`✓ 完成分类: ${categoryName}\n`);
}

console.log('=================================');
console.log('数据导入完成！');
console.log(`总计: ${totalCategories} 个分类, ${totalWords} 个单词`);
console.log('=================================');

