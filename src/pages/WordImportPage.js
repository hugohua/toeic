import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCategories, importWords } from '../utils/api';
import { categories as categoryList, getCategoryName } from '../utils/app';
import '../index.css';

function WordImportPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [validationErrors, setValidationErrors] = useState([]);

  // 加载分类列表
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCategories();
        // 将数据库返回的分类与前端分类列表匹配，添加中文名称
        const categoriesWithNames = cats.map((cat) => {
          // 优先使用数据库中的 display_name，如果没有则从前端分类列表查找
          let displayName = cat.display_name;
          if (!displayName) {
            const categoryInfo = categoryList.find((c) => c.key === cat.name);
            displayName = categoryInfo ? categoryInfo.name : cat.name;
          }
          return {
            ...cat,
            displayName: displayName,
            key: cat.name, // 保存 key 值用于提交
          };
        });
        setCategories(categoriesWithNames);
        if (categoriesWithNames.length > 0 && !selectedCategory) {
          setSelectedCategory(categoriesWithNames[0].key);
        }
      } catch (error) {
        console.error('加载分类列表失败:', error);
        setMessage({
          type: 'error',
          text: '加载分类列表失败: ' + error.message,
        });
      }
    }
    loadCategories();
  }, []);

  // 验证 JSON 数据格式
  const validateWordData = (data) => {
    const errors = [];
    
    if (!data.word || typeof data.word !== 'string' || data.word.trim() === '') {
      errors.push('单词 (word) 字段是必需的且必须是非空字符串');
    }

    // 其他字段都是可选的，但如果有值需要验证类型
    if (data.phonetic !== undefined && typeof data.phonetic !== 'string') {
      errors.push('音标 (phonetic) 必须是字符串');
    }

    if (data.partOfSpeech !== undefined && typeof data.partOfSpeech !== 'string') {
      errors.push('词性 (partOfSpeech) 必须是字符串');
    }

    if (data.coreMeaning !== undefined && typeof data.coreMeaning !== 'string') {
      errors.push('核心含义 (coreMeaning) 必须是字符串');
    }

    if (data.toeicSceneFocus !== undefined && typeof data.toeicSceneFocus !== 'string') {
      errors.push('TOEIC场景重点 (toeicSceneFocus) 必须是字符串');
    }

    if (data.sceneAssociation !== undefined && typeof data.sceneAssociation !== 'string') {
      errors.push('场景联想 (sceneAssociation) 必须是字符串');
    }

    if (data.phrase !== undefined && typeof data.phrase !== 'string') {
      errors.push('短语 (phrase) 必须是字符串');
    }

    if (data.keyCollocations !== undefined) {
      if (!Array.isArray(data.keyCollocations)) {
        errors.push('关键搭配 (keyCollocations) 必须是数组');
      } else {
        data.keyCollocations.forEach((item, index) => {
          if (typeof item !== 'string') {
            errors.push(`关键搭配 (keyCollocations[${index}]) 必须是字符串`);
          }
        });
      }
    }

    if (data.toeicExampleSentences !== undefined) {
      if (!Array.isArray(data.toeicExampleSentences)) {
        errors.push('TOEIC例句 (toeicExampleSentences) 必须是数组');
      } else {
        data.toeicExampleSentences.forEach((item, index) => {
          if (typeof item !== 'string') {
            errors.push(`TOEIC例句 (toeicExampleSentences[${index}]) 必须是字符串`);
          }
        });
      }
    }

    if (data.confusingWordsComparison !== undefined) {
      if (!Array.isArray(data.confusingWordsComparison)) {
        errors.push('易混淆词对比 (confusingWordsComparison) 必须是数组');
      } else {
        data.confusingWordsComparison.forEach((item, index) => {
          if (!item || typeof item !== 'object') {
            errors.push(`易混淆词对比 (confusingWordsComparison[${index}]) 必须是对象`);
          } else {
            if (item.word !== undefined && typeof item.word !== 'string') {
              errors.push(`易混淆词对比 (confusingWordsComparison[${index}].word) 必须是字符串`);
            }
            if (item.coreDifference !== undefined && typeof item.coreDifference !== 'string') {
              errors.push(`易混淆词对比 (confusingWordsComparison[${index}].coreDifference) 必须是字符串`);
            }
            if (item.toeicSceneFocus !== undefined && typeof item.toeicSceneFocus !== 'string') {
              errors.push(`易混淆词对比 (confusingWordsComparison[${index}].toeicSceneFocus) 必须是字符串`);
            }
          }
        });
      }
    }

    return errors;
  };

  // 处理导入
  const handleImport = async () => {
    if (!selectedCategory) {
      setMessage({ type: 'error', text: '请选择分类' });
      return;
    }

    if (!jsonInput.trim()) {
      setMessage({ type: 'error', text: '请输入 JSON 数据' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });
    setValidationErrors([]);

    try {
      // 解析 JSON
      let wordsData;
      try {
        wordsData = JSON.parse(jsonInput);
      } catch (error) {
        setMessage({ type: 'error', text: 'JSON 格式错误: ' + error.message });
        setIsLoading(false);
        return;
      }

      // 确保是数组
      if (!Array.isArray(wordsData)) {
        setMessage({ type: 'error', text: 'JSON 数据必须是数组格式' });
        setIsLoading(false);
        return;
      }

      if (wordsData.length === 0) {
        setMessage({ type: 'error', text: '数组不能为空' });
        setIsLoading(false);
        return;
      }

      // 验证每个单词数据
      const allErrors = [];
      wordsData.forEach((wordData, index) => {
        const errors = validateWordData(wordData);
        if (errors.length > 0) {
          allErrors.push(`第 ${index + 1} 个单词: ${errors.join('; ')}`);
        }
      });

      if (allErrors.length > 0) {
        setValidationErrors(allErrors);
        setMessage({
          type: 'error',
          text: `数据验证失败，共 ${allErrors.length} 个错误`,
        });
        setIsLoading(false);
        return;
      }

      // 调用 API 导入
      const result = await importWords(selectedCategory, wordsData);
      
      setMessage({
        type: 'success',
        text: `成功导入 ${result.successCount} 个单词${result.failedCount > 0 ? `，失败 ${result.failedCount} 个` : ''}`,
      });

      // 清空输入
      setJsonInput('');
      
      // 如果有失败的项目，显示详细信息
      if (result.failedWords && result.failedWords.length > 0) {
        setValidationErrors(
          result.failedWords.map(
            (item) => `单词 "${item.word}": ${item.error}`
          )
        );
      } else {
        setValidationErrors([]);
      }
    } catch (error) {
      console.error('导入失败:', error);
      setMessage({
        type: 'error',
        text: '导入失败: ' + (error.message || '未知错误'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化 JSON 输入
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setMessage({ type: 'success', text: 'JSON 格式化成功' });
    } catch (error) {
      setMessage({ type: 'error', text: 'JSON 格式错误，无法格式化' });
    }
  };

  return (
    <div className="container">
      <Header title="批量导入单词" showBack />
      <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="category-select"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            选择分类：
          </label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.key || cat.name}>
                {cat.displayName || getCategoryName(cat.name) || cat.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <label
              htmlFor="json-input"
              style={{
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              JSON 数据：
            </label>
            <button
              onClick={handleFormatJson}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              格式化 JSON
            </button>
          </div>
          <textarea
            id="json-input"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="请输入 JSON 数组，例如：[{ word: 'feature', phonetic: '/ˈfiːtʃə(r)/', ... }]"
            style={{
              width: '100%',
              minHeight: '400px',
              padding: '12px',
              fontSize: '14px',
              fontFamily: 'monospace',
              border: '1px solid #ddd',
              borderRadius: '4px',
              resize: 'vertical',
            }}
          />
        </div>

        {message.text && (
          <div
            style={{
              padding: '12px',
              marginBottom: '20px',
              borderRadius: '4px',
              backgroundColor:
                message.type === 'success' ? '#d4edda' : '#f8d7da',
              color: message.type === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${
                message.type === 'success' ? '#c3e6cb' : '#f5c6cb'
              }`,
            }}
          >
            {message.text}
          </div>
        )}

        {validationErrors.length > 0 && (
          <div
            style={{
              padding: '12px',
              marginBottom: '20px',
              borderRadius: '4px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              验证错误详情：
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {validationErrors.map((error, index) => (
                <li key={index} style={{ marginBottom: '4px', fontSize: '14px' }}>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleImport}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isLoading ? '导入中...' : '导入单词'}
          </button>
          <button
            onClick={() => {
              setJsonInput('');
              setMessage({ type: '', text: '' });
              setValidationErrors([]);
            }}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            清空
          </button>
        </div>

        <div
          style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            JSON 数据格式说明：
          </div>
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '12px',
            }}
          >
{`[
  {
    word: 'feature',                    // 必需：单词
    phonetic: '/ˈfiːtʃə(r)/',            // 可选：音标
    partOfSpeech: 'n. 名词',             // 可选：词性
    coreMeaning: '特点；特征',            // 可选：核心含义
    toeicSceneFocus: '...',              // 可选：TOEIC场景重点
    sceneAssociation: '...',              // 可选：场景联想
    phrase: '...',                       // 可选：短语
    keyCollocations: [                   // 可选：关键搭配数组
      'key feature',
      'main feature'
    ],
    toeicExampleSentences: [              // 可选：例句数组
      'One key feature...',
      'The trade fair...'
    ],
    confusingWordsComparison: [           // 可选：易混淆词数组
      {
        word: 'characteristic',
        coreDifference: '...',
        toeicSceneFocus: '...'
      }
    ]
  }
]`}
          </pre>
        </div>
      </main>
    </div>
  );
}

export default WordImportPage;

