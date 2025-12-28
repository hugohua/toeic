/**
 * 自定义 React Hooks
 */
import { useSpeech } from 'react-text-to-speech';
import { useState, useEffect, useRef } from 'react';
import { disableBodyScroll, enableBodyScroll } from './scroll';
import { getWordByWord, getWordByWordAndCategory, searchWords, grammarAnalyze } from './api';
import { cleanWordText } from './text';

/**
 * 使用默认配置的语音合成 hook
 * @param {string} text - 要朗读的文本
 * @returns {object} useSpeech 的返回值
 */
export function useSpeechConfig(text) {
  return useSpeech({
    text: text || '',
    pitch: 1,
    rate: 1,
    volume: 1,
  });
}

/**
 * 根据条件禁用/启用页面滚动的 hook
 * 适用于浮层打开时禁用背景页面滚动
 * @param {boolean} shouldDisable - 是否禁用滚动
 */
export function useDisableScroll(shouldDisable) {
  useEffect(() => {
    if (shouldDisable) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }

    return () => {
      // 清理函数：确保在组件卸载时恢复滚动
      enableBodyScroll();
    };
  }, [shouldDisable]);
}

/**
 * 单词详情和语法解析的 Hook
 * @param {object} options - 配置选项
 * @param {object} options.article - 文章对象（可选，用于 ArticleDetailPage）
 * @param {boolean} options.enableWordClick - 是否启用单词点击监听（默认 true）
 * @returns {object} 返回状态和处理函数
 */
export function useWordDetail({ article = null, enableWordClick = true } = {}) {
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordDetail, setWordDetail] = useState(null);
  const [isLoadingWordDetail, setIsLoadingWordDetail] = useState(false);
  const [grammarContent, setGrammarContent] = useState('');
  const [isLoadingGrammar, setIsLoadingGrammar] = useState(false);
  const [error, setError] = useState('');
  const articleRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 调用语法解析的辅助函数
  const callGrammarAnalyze = (cleanWord) => {
    // 如果已有正在进行的请求，先中止
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoadingWordDetail(false);
    setIsLoadingGrammar(true);
    setGrammarContent('');
    setError('');

    grammarAnalyze(
      cleanWord,
      // onChunk: 接收每个内容块，使用函数式更新确保流式输出
      (chunk) => {
        if (!abortController.signal.aborted) {
          setGrammarContent((prev) => prev + chunk);
        }
      },
      // onError: 错误处理
      (error) => {
        if (!abortController.signal.aborted) {
          console.error('语法解析错误:', error);
          setGrammarContent(`语法解析失败: ${error.message}`);
          setIsLoadingGrammar(false);
        }
      },
      // onComplete: 完成回调
      () => {
        if (!abortController.signal.aborted) {
          setIsLoadingGrammar(false);
        }
        abortControllerRef.current = null;
      },
      abortController.signal
    );
  };

  // 处理单词点击事件（ArticleDetailPage 版本：从分类中查找）
  const handleWordClickWithCategories = async (wordText) => {
    if (!wordText || !article) return;
    
    const cleanWord = cleanWordText(wordText);
    if (!cleanWord) return;

    setSelectedWord(cleanWord);
    setIsLoadingWordDetail(true);
    setWordDetail(null);
    setGrammarContent('');
    setError('');

    try {
      // 从文章的分类中查找
      let found = false;
      const categories = article.categories || [];
      
      for (const category of categories) {
        try {
          const detail = await getWordByWordAndCategory(cleanWord, category);
          if (detail) {
            setWordDetail(detail);
            setIsLoadingWordDetail(false);
            found = true;
            break;
          }
        } catch (err) {
          // 检查是否是404错误，如果是则立即调用语法解析
          if (err.message && err.message.includes('404')) {
            callGrammarAnalyze(cleanWord);
            return;
          }
          // 其他错误继续尝试下一个分类
          continue;
        }
      }

      // 如果没找到，尝试搜索所有单词
      if (!found) {
        try {
          const searchResults = await searchWords(cleanWord, 10);
          const exactMatch = searchResults.find(w => w.word.toLowerCase() === cleanWord);
          if (exactMatch) {
            // 如果找到精确匹配，获取详情
            try {
              const detail = await getWordByWordAndCategory(cleanWord, exactMatch.category_name);
              if (detail) {
                setWordDetail(detail);
                setIsLoadingWordDetail(false);
                found = true;
              }
            } catch (err) {
              // 检查是否是404错误
              if (err.message && err.message.includes('404')) {
                callGrammarAnalyze(cleanWord);
                return;
              }
              console.error('获取单词详情失败:', err);
            }
          }
        } catch (err) {
          // 搜索失败，检查是否是404
          if (err.message && err.message.includes('404')) {
            callGrammarAnalyze(cleanWord);
            return;
          }
        }
      }

      // 如果所有尝试都失败，调用语法解析
      if (!found) {
        callGrammarAnalyze(cleanWord);
      }
    } catch (err) {
      console.error('查找单词失败:', err);
      // 检查是否是404错误
      if (err.message && err.message.includes('404')) {
        callGrammarAnalyze(cleanWord);
      } else {
        setError('查找单词详情失败: ' + err.message);
        setIsLoadingWordDetail(false);
      }
    }
  };

  // 处理单词点击事件（WordArticlePage 版本：直接查找）
  const handleWordClickSimple = async (wordText) => {
    if (!wordText) return;
    
    const cleanWord = cleanWordText(wordText);
    if (!cleanWord) return;

    setSelectedWord(cleanWord);
    setIsLoadingWordDetail(true);
    setWordDetail(null);
    setGrammarContent('');
    setError('');

    try {
      // 直接根据单词获取详情，不依赖分类
      const detail = await getWordByWord(cleanWord);
      if (detail) {
        setWordDetail(detail);
        setIsLoadingWordDetail(false);
      } else {
        // 如果没找到单词详情，调用语法解析
        callGrammarAnalyze(cleanWord);
      }
    } catch (err) {
      console.error('获取单词详情失败:', err);
      // 检查是否是404错误
      if (err.message && err.message.includes('404')) {
        // 404错误时调用语法解析
        callGrammarAnalyze(cleanWord);
      } else {
        setError('查找单词详情失败: ' + err.message);
        setIsLoadingWordDetail(false);
      }
    }
  };

  // 根据是否有 article 选择不同的处理函数
  // 使用 useRef 来存储最新的处理函数，避免 useEffect 依赖问题
  const handleWordClickRef = useRef(null);
  handleWordClickRef.current = article ? handleWordClickWithCategories : handleWordClickSimple;

  // 添加点击事件监听
  useEffect(() => {
    if (!enableWordClick || !articleRef.current) return;

    const handleClick = (e) => {
      const wordElement = e.target.closest('.word-highlight');
      if (wordElement) {
        const wordText = wordElement.getAttribute('data-word');
        if (wordText && handleWordClickRef.current) {
          handleWordClickRef.current(wordText);
        }
      }
    };

    const articleElement = articleRef.current;
    articleElement.addEventListener('click', handleClick);

    return () => {
      articleElement.removeEventListener('click', handleClick);
    };
  }, [enableWordClick, article]);

  // 暴露处理函数供外部调用
  const handleWordClick = (wordText) => {
    if (handleWordClickRef.current) {
      handleWordClickRef.current(wordText);
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 组件卸载时中止正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // 关闭弹窗
  const handleCloseModal = () => {
    // 中止正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setSelectedWord(null);
    setWordDetail(null);
    setGrammarContent('');
    setError('');
    setIsLoadingGrammar(false);
  };

  // 判断弹窗是否打开
  const isModalOpen = selectedWord || wordDetail || grammarContent || isLoadingGrammar;

  return {
    // 状态
    selectedWord,
    wordDetail,
    isLoadingWordDetail,
    grammarContent,
    isLoadingGrammar,
    error,
    articleRef,
    isModalOpen,
    // 方法
    handleWordClick,
    handleCloseModal,
    setError,
  };
}

