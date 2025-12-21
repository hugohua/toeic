// 读取data.js文件
const data = require('../src/data.js');
const fs = require('fs');
const { phase } = require('./temp-data.js');
// console.log(phase)
// 判断 data.wordData.recruitment 数组每个item是否重复，最后将生成不重复的数组完整item数据写入到新文件 temp1.json 中
const uniqueWords = [];
const uniqueWordsMap = new Map();
for (const item of data.wordData.mixiaole) {
  if (!uniqueWordsMap.has(item.word)) {
    uniqueWords.push(item);
    uniqueWordsMap.set(item.word, item);
    // console.log(item.word)
  }
}

// 将 phase 数据整合到 uniqueWords 中
for (const phaseItem of phase) {
  const existingWord = uniqueWordsMap.get(phaseItem.word);
  if (existingWord) {
    // 如果单词已存在，添加 phrase 字段
    existingWord.phrase = phaseItem.phrase;
  }else{
    // console.log(existingWord)
  }
}

// 将 uniqueWords 数组写入到新文件 temp2.json 中
fs.writeFileSync('temp2.json', JSON.stringify(uniqueWords, null, 2));