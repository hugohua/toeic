// 使用动态import来加载ES模块
const fs = require('fs');
const path = require('path');

// 19个分类的单词整理为JS对象数组
const wordCategories = [
    {
      categoryId: 1,
      categoryName: "职场招聘与人才发展",
      words: [
        "foster", "assessment", "apprentice", "candidate", "resume", "executive", 
        "hire", "opportunity", "corporate", "personnel", "benefit", "potential", 
        "crew", "demand", "retire", "appoint", "dedicated", "qualified", "feedback", 
        "endeavor", "reliable", "evaluate", "flexible", "enhance", "chance", "account", 
        "orientation", "compensation", "portfolio", "defective", "vendor", "authorize", 
        "payroll", "inquiry", "workplace", "overtime", "clerk", "employment", "senior", 
        "operation", "division", "stock", "investment", "obtain", "recruit", "on-site", 
        "protective", "anticipate", "multiple", "consult", "profile", "vacancy", 
        "implement", "resign", "applicant", "supportive", "mutual", "inspired", 
        "separately", "authorized", "operator", "implementation", "timely", "passionate", 
        "punctual", "commitment", "credentials", "mutually", "aspiring", "proficiency", 
        "managerial", "diligent", "ambitious"
      ],
      count: 72
    },
    {
      categoryId: 2,
      categoryName: "商务沟通与会议",
      words: [
        "correspondence", "clarify", "conference", "session", "instruction", "agency", 
        "committee", "submit", "enclose", "arrange", "approve", "conduct", "inquire", 
        "assistance", "consider", "reference", "status", "determine", "appear", "expand", 
        "launch", "recommendation", "seek", "claim", "establish", "option", "specific", 
        "complaint", "related", "unique", "reputation", "significant", "occasion", 
        "standard", "alternative", "brief", "basis", "complex", "properly", "particularly", 
        "aspect", "emphasize", "praise", "explore", "cooperation", "connection", "eager", 
        "fairly", "absolutely", "atmosphere", "occasionally", "practical", "equally", 
        "informal", "greet", "reflect", "liaison", "agenda", "prior", "motivate", 
        "collaboration"
      ],
      count: 58
    },
    {
      categoryId: 3,
      categoryName: "商务交易与合同",
      words: [
        "merchandise", "contract", "performance", "award", "delivery", "application", 
        "advance", "fee", "supply", "warranty", "reserve", "paid", "original", "rent", 
        "release", "procedure", "register", "branch", "effective", "efficient", 
        "manufacturer", "entire", "range", "profit", "raise", "attract", "insurance", 
        "estimate", "demand", "figure", "transfer", "capacity", "grant", "compete", 
        "commission", "comparison", "component", "existing", "proceed", "prevent", 
        "dedicated", "exclusive", "storage", "transaction", "equip", "invoice", "expire", 
        "vendor", "directory", "valid", "compensation", "portfolio", "defective", 
        "shipment", "courier", "lease", "payroll", "revenue", "merger", "retail", 
        "inventory", "extensive", "promotional", "assign", "imply", "certificate", 
        "innovative"
      ],
      count: 63
    },
    {
      categoryId: 4,
      categoryName: "市场营销与推广",
      words: [
        "exhibit", "promotion", "brochure", "distribute", "potential", "commercial", 
        "device", "impress", "packaging", "property", "benefit", "campaign", "sponsor", 
        "organize", "competition", "feature", "attractive", "extend", "appeal", 
        "automatically", "achieve", "suitable", "appropriate", "assure", "consumer", 
        "numerous", "competitive", "specialize", "approximately", "contribute", 
        "productivity", "promptly", "strategy", "exceed", "specify", "negotiate", 
        "completion", "relevant", "thorough", "via", "substantial", "impact", 
        "recognition", "secure", "preference", "accessible", "situation", "incentive", 
        "incorporate"
      ],
      count: 51
    },
    {
      categoryId: 5,
      categoryName: "财务与会计",
      words: [
        "fee", "paid", "profit", "revenue", "investment", "expense", "receipt", 
        "financial", "loan", "deposit", "chart", "statement", "payroll", "accountant", 
        "invoice", "compensation", "commission", "fund", "grant", "scholarship", 
        "donation", "refund", "charge", "calculate", "statistics", "ratio", "quota", 
        "portion", "majority", "surplus", "asset", "liability", "balance", 
        "transaction", "merger", "dividend", "interest", "principal", "amortization", 
        "depreciation", "audit", "budget", "tax", "tariff", "discount", "premium", 
        "equity", "deficit"
      ],
      count: 49
    },
    {
      categoryId: 6,
      categoryName: "办公行政与文书",
      words: [
        "stationery", "appliance", "comprehensive", "stack", "facility", "corporate", 
        "procedure", "personnel", "correspondence", "enclose", "arrange", "approve", 
        "conduct", "inquire", "assistance", "consider", "reference", "status", 
        "determine", "appear", "expand", "launch", "recommendation", "seek", "claim", 
        "establish", "option", "specific", "complaint", "related", "unique", 
        "reputation", "significant", "occasion", "standard", "alternative", "brief", 
        "basis", "complex", "properly", "particularly", "aspect", "emphasize", "praise", 
        "explore", "cooperation", "connection", "eager", "fairly", "absolutely", 
        "atmosphere", "occasionally", "practical", "equally", "informal"
      ],
      count: 57
    },
    {
      categoryId: 7,
      categoryName: "产品与技术",
      words: [
        "cargo", "appliance", "merchandise", "device", "equipment", "machinery", "tool", 
        "instrument", "gadget", "component", "part", "material", "supply", "inventory", 
        "stock", "manufacture", "production", "process", "assembly", "installation", 
        "maintenance", "repair", "replacement", "upgrade", "innovation", "patent", 
        "copyright", "trademark", "brand", "model", "design", "prototype", 
        "specification", "feature", "function", "performance", "quality", "standard", 
        "test", "inspect", "evaluate", "improve", "enhance", "optimize", "streamline", 
        "automate", "digital", "electronic", "mechanical", "technical", "technological", 
        "advanced", "modern", "innovative", "sophisticated", "reliable", "durable", 
        "efficient", "effective", "safe", "secure", "user-friendly", "compatible", 
        "versatile"
      ],
      count: 68
    },
    {
      categoryId: 8,
      categoryName: "法律法规与政策",
      words: [
        "contract", "policy", "regulation", "law", "legal", "legislation", "ordinance", 
        "compliance", "standard", "rule", "requirement", "obligation", "liability", 
        "right", "privilege", "exemption", "license", "permit", "authorization", 
        "approval", "consent", "agreement", "treaty", "convention", "protocol", "clause", 
        "term", "condition", "provision", "amendment", "revision", "update", "enforce", 
        "implement", "execute", "administer", "govern", "regulate", "oversee", "monitor", 
        "inspect", "audit", "investigate", "prosecute", "defend", "sue", "lawsuit", 
        "case", "judgment", "verdict", "penalty", "fine"
      ],
      count: 52
    },
    {
      categoryId: 9,
      categoryName: "旅行与接待",
      words: [
        "transportation", "vehicle", "departure", "destination", "itinerary", 
        "accommodation", "hotel", "motel", "inn", "resort", "hostel", "lodge", "guest", 
        "visitor", "tourist", "traveler", "passenger", "flight", "train", "bus", "ship", 
        "boat", "cruise", "journey", "trip", "tour", "excursion", "voyage", "travel", 
        "commute", "transfer", "pickup", "drop-off", "airport", "station", "terminal", 
        "port", "dock", "pier", "platform", "gate", "lobby", "reception", "concierge", 
        "bellhop", "housekeeping", "catering", "banquet", "refreshment", "beverage", 
        "menu", "reservation", "booking", "confirm", "cancel", "reschedule", "delay", 
        "punctual", "timely"
      ],
      count: 59
    },
    {
      categoryId: 10,
      categoryName: "教育与培训",
      words: [
        "faculty", "apprentice", "scholarship", "education", "training", "teach", 
        "learn", "study", "student", "teacher", "professor", "instructor", "tutor", 
        "mentor", "coaching", "course", "program", "curriculum", "syllabus", "lesson", 
        "lecture", "seminar", "workshop", "conference", "session", "class", 
        "classroom", "campus", "school", "college", "university", "institute", 
        "academy", "degree", "diploma", "certificate", "qualification", "credential", 
        "skill", "knowledge", "expertise", "proficiency", "competence", "ability", 
        "aptitude", "talent", "master", "acquire", "gain", "obtain", "develop", 
        "improve", "enhance", "refine", "polish", "practice", "drill", "exercise", 
        "assignment", "homework", "project", "thesis", "dissertation"
      ],
      count: 61
    },
    {
      categoryId: 11,
      categoryName: "医疗与健康",
      words: [
        "health", "medical", "medicine", "medication", "pharmacy", "pharmacist", 
        "doctor", "nurse", "physician", "surgeon", "dentist", "hospital", "clinic", 
        "healthcare", "treatment", "therapy", "diagnosis", "symptom", "illness", 
        "disease", "injury", "wound", "pain", "relief", "cure", "remedy", "vaccine", 
        "injection", "pill", "tablet", "capsule", "syrup", "ointment", "cream", 
        "bandage", "brace", "cast", "surgery", "operation", "checkup", "examination", 
        "test", "scan", "x-ray", "laboratory", "lab", "result", "report"
      ],
      count: 47
    },
    {
      categoryId: 12,
      categoryName: "建筑与设施",
      words: [
        "railing", "facility", "property", "building", "structure", "architecture", 
        "architect", "construction", "build", "construct", "erect", "demolish", 
        "renovate", "remodel", "repair", "maintain", "equipment", "tool", "material", 
        "brick", "steel", "concrete", "wood", "lumber", "glass", "pane", "window", 
        "door", "hallway", "staircase", "elevator", "escalator", "room", "office", 
        "cubicle", "desk", "chair", "stool", "table", "shelf", "cabinet", "cupboard", 
        "closet", "storage", "warehouse", "garage", "workshop", "factory", "plant", 
        "mill", "refinery", "power plant", "station", "terminal", "airport", "port", 
        "dock", "pier", "platform", "road", "highway", "street", "lane", "sidewalk", 
        "curb"
      ],
      count: 65
    },
    {
      categoryId: 13,
      categoryName: "餐饮与食品",
      words: [
        "ingredient", "cuisine", "food", "beverage", "menu", "recipe", "cook", "chef", 
        "kitchen", "restaurant", "café", "bistro", "diner", "cafeteria", "bakery", 
        "pastry", "grocery", "market", "store", "shop", "vendor", "supplier", 
        "distributor", "producer", "manufacturer", "farm", "agricultural", "crop", 
        "harvest", "fruit", "vegetable", "meat", "fish", "dairy", "egg", "bread", 
        "cereal", "rice", "pasta", "sauce", "seasoning", "agriculture"
      ],
      count: 42
    },
    {
      categoryId: 14,
      categoryName: "艺术与文化",
      words: [
        "art", "artist", "painting", "drawing", "sculpture", "statue", "portrait", 
        "mural", "gallery", "museum", "exhibition", "exhibit", "performance", 
        "concert", "theater", "opera", "ballet", "dance", "music", "song", 
        "instrument", "pianist", "musician", "writer", "author", "poet", "novelist", 
        "literature", "book", "novel", "story", "poem", "play", "script", "manuscript", 
        "edition", "publisher", "editor", "printing", "illustration", "design", 
        "fashion", "clothing", "attire", "jewelry"
      ],
      count: 45
    },
    {
      categoryId: 15,
      categoryName: "自然与环境",
      words: [
        "wildlife", "ecology", "environment", "environmental", "nature", "natural", 
        "landscape", "gardening", "plant", "tree", "flower", "grass", "lawn", "garden", 
        "park", "forest", "woods", "jungle", "mountain", "hill", "valley", "river", 
        "lake", "ocean", "sea", "beach", "shore", "coast", "island", "desert", "plain", 
        "field", "meadow", "pasture", "animal", "bird", "fish", "insect", "butterfly", 
        "bee", "ant", "worm", "spider", "snake", "lizard", "frog", "toad"
      ],
      count: 48
    },
    {
      categoryId: 16,
      categoryName: "社会与政府",
      words: [
        "resident", "council", "government", "state", "nation", "country", "city", 
        "town", "village", "community", "society", "social", "public", "private", 
        "individual", "group", "organization", "association", "institution", "agency", 
        "department", "ministry", "official", "politician", "leader", "mayor", 
        "governor", "president", "prime minister", "senator", "representative", 
        "congress", "parliament", "assembly", "vote", "election", "campaign", "policy", 
        "regulation", "law", "legal", "justice", "court", "police", "army", "military", 
        "defense", "security", "safety", "order", "peace", "conflict", "war", "crisis"
      ],
      count: 54
    },
    {
      categoryId: 17,
      categoryName: "心理与情感",
      words: [
        "pleased", "appreciate", "regret", "eager", "passionate", "motivated", 
        "inspired", "ambitious", "diligent", "reliable", "loyal", "faithful", "honest", 
        "integrity", "sincere", "genuine", "kind", "considerate", "thoughtful", 
        "caring", "compassionate", "empathetic", "sympathetic", "emotional", 
        "feeling", "mood", "attitude", "perception", "perspective", "insight", 
        "understanding", "knowledge", "wisdom", "intelligence", "creativity", 
        "ingenuity", "talent", "skill", "ability", "aptitude", "competence", 
        "proficiency", "expertise"
      ],
      count: 44
    },
    {
      categoryId: 18,
      categoryName: "数字与科技",
      words: [
        "digital", "electronic", "technological", "technology", "science", "scientific", 
        "computer", "computerized", "internet", "network", "online", "offline", 
        "software", "hardware", "program", "application", "system", "database", "data", 
        "information", "statistic", "statistician", "analysis", "analyze", "analytical", 
        "technical", "technician", "engineer", "engineering", "innovation", 
        "innovative", "invention", "inventor", "patent", "copyright", "trademark", 
        "brand", "model", "design", "prototype", "specification", "feature", 
        "function", "performance", "quality", "standard", "test", "inspect", 
        "evaluate", "improve", "enhance", "optimize", "streamline", "automate", 
        "digitalize", "digitize", "virtual", "virtual reality", "artificial intelligence", 
        "AI", "machine learning", "robotics", "robot"
      ],
      count: 62
    },
    {
      categoryId: 19,
      categoryName: "时间与日期",
      words: [
        "upcoming", "subsequent", "initial", "decade", "annual", "monthly", "weekly", 
        "daily", "hourly", "minute", "second", "time", "hour", "day", "week", "month", 
        "year", "decade", "century", "millennium", "date", "calendar", "schedule", 
        "timetable", "deadline", "due", "punctual", "timely", "early", "late", 
        "on time", "in time", "delay", "postpone", "reschedule", "extend", "prolong", 
        "shorten"
      ],
      count: 38
    }
  ];
  

// 主函数
async function compareAndFilterWords() {
  try {
    // 动态导入ES模块
    const { wordData } = await import('../src/data.js');
    
    // 从 data.js 中提取所有单词的 word 字段，创建 Set 用于快速查找
    const existingWordsSet = new Set();
    
    // 遍历wordData对象的所有键（如mixiaole等）
    for (const category in wordData) {
      if (Array.isArray(wordData[category])) {
        wordData[category].forEach(wordObj => {
          if (wordObj.word) {
            // 转换为小写进行比较，确保大小写不敏感
            existingWordsSet.add(wordObj.word.toLowerCase());
          }
        });
      }
    }
    
    console.log(`data.js 中找到 ${existingWordsSet.size} 个唯一单词`);
    
    // 过滤 wordCategories，移除已存在的单词
    const filteredCategories = wordCategories.map(category => {
      const originalCount = category.words.length;
      const filteredWords = category.words.filter(word => {
        // 移除在 data.js 中已存在的单词（大小写不敏感）
        return !existingWordsSet.has(word.toLowerCase());
      });
      
      const removedCount = originalCount - filteredWords.length;
      
      return {
        ...category,
        words: filteredWords,
        count: filteredWords.length,
        originalCount: originalCount,
        removedCount: removedCount
      };
    });
    
    // 统计信息
    const totalOriginalWords = wordCategories.reduce((sum, cat) => sum + cat.words.length, 0);
    const totalFilteredWords = filteredCategories.reduce((sum, cat) => sum + cat.words.length, 0);
    const totalRemovedWords = totalOriginalWords - totalFilteredWords;
    
    console.log(`\n统计信息:`);
    console.log(`原始单词总数: ${totalOriginalWords}`);
    console.log(`已存在单词数: ${totalRemovedWords}`);
    console.log(`过滤后单词数: ${totalFilteredWords}`);
    
    // 生成文本内容
    let outputText = `单词对比过滤结果\n`;
    outputText += `${'='.repeat(60)}\n`;
    outputText += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    outputText += `data.js 中的单词总数: ${existingWordsSet.size}\n`;
    outputText += `wordCategories 原始单词总数: ${totalOriginalWords}\n`;
    outputText += `已移除单词数: ${totalRemovedWords}\n`;
    outputText += `过滤后剩余单词数: ${totalFilteredWords}\n`;
    outputText += `${'='.repeat(60)}\n\n`;
    
    // 输出每个分类的详细信息
    filteredCategories.forEach(category => {
      outputText += `分类 ${category.categoryId}: ${category.categoryName}\n`;
      outputText += `  原始数量: ${category.originalCount}\n`;
      outputText += `  已移除: ${category.removedCount}\n`;
      outputText += `  剩余数量: ${category.count}\n`;
      
      if (category.words.length > 0) {
        outputText += `  剩余单词:\n`;
        // 每行显示5个单词
        for (let i = 0; i < category.words.length; i += 5) {
          const wordsLine = category.words.slice(i, i + 5).join(', ');
          outputText += `    ${wordsLine}\n`;
        }
      } else {
        outputText += `  剩余单词: 无\n`;
      }
      outputText += `\n${'-'.repeat(60)}\n\n`;
    });
    
    // 汇总：列出所有剩余的单词
    outputText += `\n${'='.repeat(60)}\n`;
    outputText += `所有剩余单词汇总（共 ${totalFilteredWords} 个）\n`;
    outputText += `${'='.repeat(60)}\n\n`;
    
    const allRemainingWords = [];
    filteredCategories.forEach(category => {
      category.words.forEach(word => {
        allRemainingWords.push({
          word: word,
          category: category.categoryName
        });
      });
    });
    
    // 按单词字母顺序排序
    allRemainingWords.sort((a, b) => a.word.localeCompare(b.word));
    
    allRemainingWords.forEach((item, index) => {
      outputText += `${index + 1}. ${item.word} (${item.category})\n`;
    });
    
    // 写入文件
    const outputPath = path.join(__dirname, 'filtered_words_result.txt');
    fs.writeFileSync(outputPath, outputText, 'utf-8');
    
    console.log(`\n成功导出到: ${outputPath}`);
    console.log(`文件大小: ${(outputText.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('处理失败:', error);
    process.exit(1);
  }
}

// 执行对比和过滤
compareAndFilterWords();

