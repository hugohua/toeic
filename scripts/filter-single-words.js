const fs = require('fs');
const path = require('path');

// 读取文件路径
const inputFile = path.join(__dirname, 'missing_words.txt');
// 可以通过命令行参数选择输出方式：默认生成新文件，使用 --overwrite 覆盖原文件
const shouldOverwrite = process.argv.includes('--overwrite');
const outputFile = shouldOverwrite 
  ? inputFile 
  : path.join(__dirname, 'missing_words_filtered.txt');

// 读取文件内容
const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n').map(line => line.trim()).filter(line => line);

// 过滤函数：判断是否为单个单词
function isSingleWord(word) {
  // 移除首尾空白
  const trimmed = word.trim();
  
  // 如果为空，返回 false
  if (!trimmed) {
    return false;
  }
  
  // 如果包含空格，说明是词组或短句
  if (trimmed.includes(' ')) {
    return false;
  }
  
  // 如果包含方括号（如 "as [so] far as"），说明是词组
  if (trimmed.includes('[') || trimmed.includes(']')) {
    return false;
  }
  
  // 如果包含括号且括号内不是单个字符（如 "make (...) sense"），说明是词组
  // 但允许单个字符的括号（如某些特殊标记）
  const parenMatch = trimmed.match(/\([^)]+\)/);
  if (parenMatch && parenMatch[0].length > 3) { // 括号内容超过1个字符
    return false;
  }
  
  // 其他情况认为是单个单词
  return true;
}

// 过滤出单个单词
const singleWords = lines.filter(line => isSingleWord(line));

// 统计信息
const totalLines = lines.length;
const filteredCount = singleWords.length;
const removedCount = totalLines - filteredCount;

console.log('=================================');
console.log('过滤结果统计：');
console.log(`原始条目数: ${totalLines}`);
console.log(`单个单词数: ${filteredCount}`);
console.log(`移除词组/短句数: ${removedCount}`);
console.log('=================================\n');

// 如果覆盖原文件，先创建备份
if (shouldOverwrite) {
  const backupFile = inputFile + '.backup';
  fs.copyFileSync(inputFile, backupFile);
  console.log(`✓ 已创建备份: ${backupFile}`);
}

// 写入文件
const outputContent = singleWords.join('\n') + '\n';
fs.writeFileSync(outputFile, outputContent, 'utf-8');

console.log(`✓ 已保存到: ${outputFile}`);

// 显示一些被移除的示例（前10个）
const removedWords = lines.filter(line => !isSingleWord(line));
if (removedWords.length > 0) {
  console.log('\n被移除的词组/短句示例（前10个）：');
  removedWords.slice(0, 10).forEach(word => {
    console.log(`  - "${word}"`);
  });
}

