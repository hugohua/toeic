import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCategories, importWords } from '../utils/api';
import { getCategoryName } from '../utils/app';
import '../index.css';
import './WordImportPage.css';

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
        // 使用数据库中的 display_name，如果没有则使用 name
        const categoriesWithNames = cats.map((cat) => ({
          ...cat,
          displayName: cat.display_name || cat.name,
          key: cat.name, // 保存 key 值用于提交
        }));
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
      <main className="word-import-content">
        <div className="word-import-form-group">
          <label
            htmlFor="category-select"
            className="word-import-label"
          >
            选择分类：
          </label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="word-import-select"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.key || cat.name}>
                {cat.displayName || getCategoryName(cat.name) || cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="word-import-form-group">
          <div className="word-import-input-header">
            <label
              htmlFor="json-input"
              className="word-import-label"
            >
              JSON 数据：
            </label>
            <button
              onClick={handleFormatJson}
              className="word-import-format-btn"
            >
              格式化 JSON
            </button>
          </div>
          <textarea
            id="json-input"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="请输入 JSON 数组，例如：[{ word: 'feature', phonetic: '/ˈfiːtʃə(r)/', ... }]"
            className="word-import-textarea"
          />
        </div>

        {message.text && (
          <div
            className={`word-import-message ${
              message.type === 'success'
                ? 'word-import-message-success'
                : 'word-import-message-error'
            }`}
          >
            {message.text}
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="word-import-errors">
            <div className="word-import-errors-title">
              验证错误详情：
            </div>
            <ul className="word-import-errors-list">
              {validationErrors.map((error, index) => (
                <li key={index} className="word-import-errors-item">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="word-import-actions">
          <button
            onClick={handleImport}
            disabled={isLoading}
            className="word-import-submit-btn"
          >
            {isLoading ? '导入中...' : '导入单词'}
          </button>
          <button
            onClick={() => {
              setJsonInput('');
              setMessage({ type: '', text: '' });
              setValidationErrors([]);
            }}
            className="word-import-clear-btn"
          >
            清空
          </button>
        </div>

        <div className="word-import-info">
          <div className="word-import-info-title">
            JSON 数据格式说明：
          </div>
          <pre className="word-import-info-pre">
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

