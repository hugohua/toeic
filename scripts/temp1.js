// 读取data.js文件
const data = require('../src/data.js');
const fs = require('fs');

console.log(data.wordData.recruitment.length);

// 判断 data.wordData.recruitment 数组每个item是否重复，最后将生成不重复的数组完整item数据写入到新文件 temp1.json 中
const uniqueWords = [];
const uniqueWordsMap = new Map();
for (const item of data.wordData.recruitment) {
  if (!uniqueWordsMap.has(item.word)) {
    uniqueWords.push(item);
    uniqueWordsMap.set(item.word, item);
  }
}
console.log(uniqueWords.length);
// 将 uniqueWords 数组写入到新文件 temp1.json 中
fs.writeFileSync('temp1.json', JSON.stringify(uniqueWords, null, 2));