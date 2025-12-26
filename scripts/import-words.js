const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const config = require('../config');
const Database = require('better-sqlite3');
const { batchImportWords } = require('../src/db/database');

// 数据库连接（用于查询分类信息）
const dbPath = path.join(__dirname, '../data', 'words.db');
const db = new Database(dbPath);

// 初始化 OpenAI 客户端
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseURL,
});

// 读取 word.txt 文件
const wordFilePath = path.join(__dirname, 'word.txt');
const wordFileContent = fs.readFileSync(wordFilePath, 'utf-8');

// 解析 word.txt 文件，提取分类ID和单词列表
function parseWordFile(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const categories = [];
  
  for (let i = 0; i < lines.length; i += 2) {
    if (i + 1 >= lines.length) break;
    
    const categoryLine = lines[i];
    const wordsLine = lines[i + 1];
    
    // 提取分类ID（支持"分类：11"或"分类：旅行与接待"格式）
    const categoryMatch = categoryLine.match(/分类[：:](.+)/);
    if (!categoryMatch) continue;
    
    const categoryId = categoryMatch[1].trim();
    
    // 解析单词列表（逗号分隔）
    const words = wordsLine
      .split(',')
      .map(w => w.trim())
      .filter(w => w);
    
    if (words.length > 0) {
      categories.push({
        name: categoryId, // 分类ID（如 "11"）或分类名称
        words: words,
      });
    }
  }
  
  return categories;
}

// 构建 prompt
function buildPrompt(words) {
  const wordList = words.join(', ');
  
  return `请将这些托业单词，按照上面的JSON格式进行输出，整合输出成一个数组对象即可。
其中
1、toeicSceneFocus尽量符合托业考试特点
2、其中phrase是该单词的短语或短句，不用太长每个短语2-10个单词内即可。
3、confusingWordsComparison中近义词给2-4个左右即可。
后续我将给你一组单词，请给出每个单词的解释，用代码库框住，JSON格式输出，注意要确保JSON格式的正确性。

单个单词的格式如下：
{
    "word": "candidate",
    "phonetic": "/ˈkændɪdeɪt/",
    "phrase": "a qualified job candidate",
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
        "She is a strong candidate for the marketing manager position due to her rich industry experience.（凭借丰富的行业经验，她是营销经理岗位的有力候选人。）",
        "The HR team will assess each candidate's professional skills and cultural fit.（人力资源团队将评估每位候选人的专业技能和文化适配度。）",
        "We are still looking for qualified candidates to fill the vacant positions in the IT department.（我们仍在寻找合格的候选人填补IT部门的空缺岗位。）"
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

${wordList}`;
}

// 调用 OpenAI API 生成单词解释
async function generateWordData(words) {
  const prompt = buildPrompt(words);
  
  console.log(`正在为 ${words.length} 个单词生成解释...`);
  console.log(`单词列表: ${words.join(', ')}`);
  
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

// 根据分类ID或名称获取分类名称
function getCategoryName(categoryIdOrName) {
  // 检查是否是数字（分类ID）
  const categoryId = parseInt(categoryIdOrName);
  if (!isNaN(categoryId) && categoryId > 0) {
    // 是数字，按ID查询
    const category = db
      .prepare('SELECT id, name FROM categories WHERE id = ?')
      .get(categoryId);
    
    if (!category) {
      throw new Error(`分类ID ${categoryId} 不存在于数据库中`);
    }
    
    console.log(`找到分类: ID=${category.id}, name="${category.name}"`);
    return category.name;
  }
  
  // 不是数字，直接使用作为分类名称
  return categoryIdOrName;
}

// 直接导入单词到数据库
function importWords(categoryIdOrName, wordsData) {
  try {
    // 获取实际的分类名称
    const categoryName = getCategoryName(categoryIdOrName);
    const result = batchImportWords(categoryName, wordsData);
    return result;
  } catch (error) {
    console.error('导入单词时出错:', error.message);
    throw error;
  }
}

// 主函数
async function main() {
  const BATCH_SIZE = 10; // 每批处理的单词数量
  
  console.log('开始导入单词...\n');
  console.log(`每批处理 ${BATCH_SIZE} 个单词以确保AI生成质量\n`);
  
  // 解析 word.txt 文件
  const categories = parseWordFile(wordFileContent);
  console.log(`找到 ${categories.length} 个分类\n`);
  
  let totalImported = 0;
  
  // 处理每个分类
  for (let i = 0; i < categories.length; i++) {
    const { name, words } = categories[i];
    
    console.log(`\n=================================`);
    console.log(`处理分类 ${i + 1}/${categories.length}: ${name} (分类ID)`);
    console.log(`单词数量: ${words.length}`);
    console.log(`=================================\n`);
    
    // 将单词列表分成批次（每批10个）
    const wordBatches = chunkArray(words, BATCH_SIZE);
    console.log(`将分成 ${wordBatches.length} 批处理（每批 ${BATCH_SIZE} 个单词）\n`);
    
    let categoryImported = 0;
    
    // 处理每个批次
    for (let batchIndex = 0; batchIndex < wordBatches.length; batchIndex++) {
      const batch = wordBatches[batchIndex];
      const batchNumber = batchIndex + 1;
      
      console.log(`--- 批次 ${batchNumber}/${wordBatches.length} (${batch.length} 个单词) ---`);
      
      try {
        // 生成单词数据
        const wordData = await generateWordData(batch);
        console.log(`✓ 成功生成 ${wordData.length} 个单词的解释`);
        
        // 导入到数据库
        const result = importWords(name, wordData);
        const successCount = result.successCount || 0;
        const failedCount = result.failedCount || 0;
        
        categoryImported += successCount;
        totalImported += successCount;
        
        if (successCount > 0) {
          console.log(`✓ 成功导入 ${successCount} 个单词`);
        }
        if (failedCount > 0) {
          console.log(`⚠ 失败 ${failedCount} 个单词`);
          if (result.failedWords && result.failedWords.length > 0) {
            result.failedWords.forEach(failed => {
              console.log(`  - ${failed.word}: ${failed.error}`);
            });
          }
        }
        
        // 批次之间等待，避免请求过快
        if (batchIndex < wordBatches.length - 1) {
          console.log('等待 2 秒后处理下一批...\n');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log('');
        }
      } catch (error) {
        console.error(`✗ 批次 ${batchNumber} 处理失败:`, error.message);
        console.error('跳过该批次，继续处理下一批...\n');
      }
    }
    
    console.log(`分类 "${name}" 完成，共导入 ${categoryImported}/${words.length} 个单词\n`);
    
    // 分类之间等待，避免请求过快
    if (i < categories.length - 1) {
      console.log('等待 1 秒后处理下一个分类...\n');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n=================================');
  console.log('所有分类处理完成！');
  console.log(`总计导入: ${totalImported} 个单词`);
  console.log('=================================');
}

// 运行主函数
main()
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  })
  .finally(() => {
    // 关闭数据库连接
    db.close();
  });

