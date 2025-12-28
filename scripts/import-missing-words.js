const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const config = require('../config');
const {
  insertWord,
  insertCollocations,
  insertExampleSentences,
  insertConfusingWords,
} = require('../src/db/database');

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseURL,
});

// 读取 missing_words.json 文件
const missingWordsPath = path.join(__dirname, 'missing_words.json');
const missingWordsContent = fs.readFileSync(missingWordsPath, 'utf-8');
const missingWords = JSON.parse(missingWordsContent);

// 构建 prompt
function buildPrompt(wordsArray) {
  const wordListJson = JSON.stringify(wordsArray, null, 2);
  
  return `请将这些托业单词，按照上面的JSON格式进行输出，整合输出成一个数组对象即可。toeicSceneFocus尽量符合托业考试特点
后续我将给你一组单词，请给出每个单词的解释，用代码库框住，JSON格式输出。
单个单词的格式如下：
{
    "word": "candidate",
    phonetic: '/ɑːrˈtɪkjuleɪt/（音标）',
    "phrase": "a qualified job candidate",
    "level": 12,
    "partOfSpeech": "n. 名词",
    "coreMeaning": "候选人；申请者；求职者（指申请职位、竞选岗位或参与选拔的人）",
    "toeicSceneFocus": "多出现于招聘广告、面试沟通、人事通知、职位选拔等语境，是描述"潜在录用对象"的正式商务用词，托业阅读（招聘启事、人事邮件）和听力（职场对话）中频繁考查",
    "keyCollocations": [
    "job candidate（求职者）",
    "candidate for sth.（……的候选人/申请者）",
    "qualified candidate（合格候选人）",
    "shortlisted candidate（入围候选人）",
    "interview a candidate（面试候选人）"
    ],
    "toeicExampleSentences": [
    "The company received over 200 applications, but only 10 candidates were shortlisted for interviews.（公司收到了200多份申请，但仅10名候选人入围面试。）",
    "She is a strong candidate for the marketing manager position due to her rich industry experience.（凭借丰富的行业经验，她是营销经理岗位的有力候选人。）"
    ],
    "sceneAssociation": "可以联想"招聘面试现场，HR正在与候选人（candidate）沟通工作经历"的画面，或"人事邮件中写着'恭喜你成为该职位的最终候选人（final candidate）'"，结合职场选拔中"申请或被选拔的人"的核心场景快速记忆",
    "confusingWordsComparison": [
    {
        "word": "candidate",
        "coreDifference": "侧重"正式申请职位、参与选拔的候选人"，范围较窄（多指向职场/选拔）",
        "toeicSceneFocus": "招聘、职位竞争、人才评估场景"
    },
    {
        "word": "applicant",
        "coreDifference": "泛指"申请者"，可指申请职位、学校、项目等，范围更广",
        "toeicSceneFocus": "各类申请场景（职场、学术、福利等）"
    },
    {
        "word": "aspirant",
        "coreDifference": "侧重"有抱负、渴望获得某职位/身份的人"，语气较书面",
        "toeicSceneFocus": "高阶职位选拔、职业发展相关场景"
    },
    {
        "word": "interviewee",
        "coreDifference": "侧重"参加面试的人"，仅聚焦"面试环节"",
        "toeicSceneFocus": "面试沟通、面试流程相关描述"
    }
    ]
}

给从的单词列表如下，请补全完整的内容： ${wordListJson}`;
}

// 调用 OpenAI API 生成单词解释
async function generateWordData(wordsArray) {
  const prompt = buildPrompt(wordsArray);
  
  const wordList = wordsArray.map(w => w.word).join(', ');
  console.log(`正在为 ${wordsArray.length} 个单词生成解释...`);
  console.log(`单词列表: ${wordList}`);
  
  let content = '';
  
  try {
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
    });
    
    content = completion.choices[0].message.content;
    
    // 尝试从响应中提取 JSON（可能在代码块中）
    let jsonContent = content;
    
    // 如果内容被代码块包裹，提取 JSON
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
    }
    
    // 解析 JSON
    const wordData = JSON.parse(jsonContent);
    
    if (!Array.isArray(wordData)) {
      throw new Error('返回的数据不是数组格式');
    }
    
    // 确保每个单词都保留了原始的 level 字段
    // 如果API返回的数据中没有level，从原始数据中补充
    const wordMap = new Map(wordsArray.map(w => [w.word.toLowerCase(), w]));
    
    wordData.forEach(word => {
      if (!word.level) {
        const originalWord = wordMap.get(word.word.toLowerCase());
        if (originalWord) {
          word.level = originalWord.level;
        }
      }
    });
    
    return wordData;
  } catch (error) {
    console.error('生成单词数据时出错:', error.message);
    if (error.message.includes('JSON') && content) {
      console.error('响应内容:', content);
    }
    throw error;
  }
}

// 将数组分成指定大小的批次
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// 直接导入单词到数据库（使用指定的 category_id）
function importWordsWithCategoryId(categoryId, wordsData) {
  const result = {
    successCount: 0,
    failedCount: 0,
    failedWords: [],
  };

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

  return result;
}

// 保存失败的单词到日志文件
function saveFailedWords(failedWords, outputPath, saveSimpleFormat = false) {
  if (failedWords.length === 0) {
    console.log('没有失败的单词，无需保存日志文件');
    return;
  }

  try {
    if (saveSimpleFormat) {
      // 保存简化格式（只包含word, phrase, level），可以直接用于导入
      const simpleFormat = failedWords
        .filter(item => item.word) // 过滤掉没有word的项
        .map(item => {
          const simple = {
            word: item.word,
          };
          // 只添加存在的字段
          if (item.phrase !== undefined && item.phrase !== null) {
            simple.phrase = item.phrase;
          }
          if (item.level !== undefined && item.level !== null) {
            simple.level = item.level;
          }
          return simple;
        });
      const jsonContent = JSON.stringify(simpleFormat, null, 2);
      fs.writeFileSync(outputPath, jsonContent, 'utf-8');
    } else {
      // 保存完整日志格式（包含错误信息等）
      const logData = {
        timestamp: new Date().toISOString(),
        totalFailed: failedWords.length,
        failedWords: failedWords,
      };
      const jsonContent = JSON.stringify(logData, null, 2);
      fs.writeFileSync(outputPath, jsonContent, 'utf-8');
    }
    
    console.log(`\n✓ 失败单词日志已保存到: ${outputPath}`);
    console.log(`  共 ${failedWords.length} 个失败的单词`);
  } catch (error) {
    console.error('保存失败单词日志失败:', error.message);
  }
}

// 并发控制：同时处理多个批次的函数
async function processBatchWithConcurrency(batches, concurrency, categoryId) {
  const results = {
    totalImported: 0,
    totalFailed: 0,
    failedBatches: [],
    failedWords: [], // 收集所有失败的单词（包括批次失败和单个单词失败）
  };

  // 创建一个处理单个批次的函数
  const processSingleBatch = async (batch, batchIndex, totalBatches) => {
    const batchNumber = batchIndex + 1;
    
    console.log(`=================================`);
    console.log(`批次 ${batchNumber}/${totalBatches} (${batch.length} 个单词)`);
    console.log(`=================================`);
    
    try {
      // 生成单词数据
      const wordData = await generateWordData(batch);
      console.log(`✓ [批次 ${batchNumber}] 成功生成 ${wordData.length} 个单词的解释`);
      
      // 导入到数据库
      const result = importWordsWithCategoryId(categoryId, wordData);
      const successCount = result.successCount || 0;
      const failedCount = result.failedCount || 0;
      
      results.totalImported += successCount;
      results.totalFailed += failedCount;
      
      if (successCount > 0) {
        console.log(`✓ [批次 ${batchNumber}] 成功导入 ${successCount} 个单词`);
      }
      if (failedCount > 0) {
        console.log(`⚠ [批次 ${batchNumber}] 失败 ${failedCount} 个单词`);
        if (result.failedWords && result.failedWords.length > 0) {
          result.failedWords.forEach(failed => {
            console.log(`  - ${failed.word}: ${failed.error}`);
            
            // 收集单个单词失败的信息（尝试找到对应的生成数据）
            const wordDataItem = wordData.find(w => 
              w.word && w.word.toLowerCase() === failed.word.toLowerCase()
            );
            
            if (wordDataItem) {
              // 如果有生成的数据，保存完整数据
              results.failedWords.push({
                ...wordDataItem,
                error: failed.error,
                failedAt: 'database_import',
              });
            } else {
              // 如果没有生成的数据，保存原始数据
              const originalWord = batch.find(w => 
                w.word && w.word.toLowerCase() === failed.word.toLowerCase()
              );
              if (originalWord) {
                results.failedWords.push({
                  ...originalWord,
                  error: failed.error,
                  failedAt: 'database_import',
                });
              }
            }
          });
        }
      }
      
      console.log(`✓ [批次 ${batchNumber}] 处理完成\n`);
      return { success: true, batchNumber, result };
    } catch (error) {
      console.error(`✗ [批次 ${batchNumber}] 处理失败:`, error.message);
      results.totalFailed += batch.length;
      results.failedBatches.push({
        batchNumber,
        words: batch.map(w => w.word),
        error: error.message,
      });
      
      // 收集批次失败的单词（保存原始数据）
      batch.forEach(originalWord => {
        results.failedWords.push({
          ...originalWord,
          error: error.message,
          failedAt: 'batch_processing',
        });
      });
      
      console.error(`跳过批次 ${batchNumber}，继续处理其他批次...\n`);
      return { success: false, batchNumber, error: error.message };
    }
  };

  // 并发控制：使用 Promise 池
  const executing = [];
  let completed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // 创建处理任务
    const task = processSingleBatch(batch, i, batches.length)
      .finally(() => {
        // 任务完成后，从执行队列中移除
        const index = executing.indexOf(task);
        if (index > -1) {
          executing.splice(index, 1);
        }
        completed++;
        
        // 显示总体进度
        const progress = ((completed / batches.length) * 100).toFixed(1);
        console.log(`[总体进度] ${completed}/${batches.length} (${progress}%)\n`);
      });

    executing.push(task);

    // 如果达到并发限制，等待至少一个任务完成
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  // 等待所有剩余任务完成
  await Promise.all(executing);

  return results;
}

// 主函数
async function main() {
  const BATCH_SIZE = 7; // 每批处理的单词数量
  const CATEGORY_ID = 24; // 统一使用 category_id 24
  const CONCURRENT_BATCHES = 4; // 并发处理的批次数量（可根据API限流调整）
  
  console.log('开始导入缺失单词...\n');
  console.log(`每批处理 ${BATCH_SIZE} 个单词以确保AI生成质量`);
  console.log(`并发处理 ${CONCURRENT_BATCHES} 个批次以提高效率`);
  console.log(`总计 ${missingWords.length} 个单词需要处理`);
  console.log(`使用分类ID: ${CATEGORY_ID}\n`);
  
  // 将单词列表分成批次
  const wordBatches = chunkArray(missingWords, BATCH_SIZE);
  console.log(`将分成 ${wordBatches.length} 批处理（每批 ${BATCH_SIZE} 个单词）\n`);
  
  const startTime = Date.now();
  
  // 使用并发控制处理所有批次
  const results = await processBatchWithConcurrency(
    wordBatches,
    CONCURRENT_BATCHES,
    CATEGORY_ID
  );
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  console.log('\n=================================');
  console.log('所有批次处理完成！');
  console.log(`总计导入: ${results.totalImported} 个单词`);
  console.log(`总计失败: ${results.totalFailed} 个单词`);
  console.log(`分类ID: ${CATEGORY_ID}`);
  console.log(`总耗时: ${duration} 秒`);
  if (results.failedBatches.length > 0) {
    console.log(`失败的批次数: ${results.failedBatches.length}`);
    results.failedBatches.forEach(failed => {
      console.log(`  - 批次 ${failed.batchNumber}: ${failed.error}`);
    });
  }
  console.log('=================================');
  
  // 保存失败的单词到日志文件
  if (results.failedWords && results.failedWords.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    // 保存完整日志（包含错误信息）
    const failedWordsLogPath = path.join(__dirname, `failed_words_${timestamp}.json`);
    saveFailedWords(results.failedWords, failedWordsLogPath, false);
    
    // 保存简化格式（可直接用于导入，替换missing_words.json）
    const latestFailedWordsPath = path.join(__dirname, 'failed_words_latest.json');
    saveFailedWords(results.failedWords, latestFailedWordsPath, true);
    
    console.log(`\n提示: 可以使用 failed_words_latest.json 文件进行二次导入`);
    console.log(`      (该文件格式与 missing_words.json 相同，可直接替换使用)`);
  }
}

// 运行主函数
main()
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });

