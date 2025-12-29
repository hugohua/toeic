import React, { useState, useEffect, useMemo } from 'react';
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom';
import { useSpeechConfig } from '../utils/hooks';
import { getWordsByCategory } from '../utils/api';
import Header from '../components/Header';
import WordDetailContent from '../components/WordDetailContent';
import Loading from '../components/Loading';
import { getCategoryName } from '../utils/app';
import {
  isWordInList,
  toggleWordInList,
  WORD_LIST_TYPES,
} from '../utils/storage';
import '../index.css';
import './WordDetailPage.css';

// 列表类型配置：定义所有支持的列表类型及其元数据
const LIST_TYPE_CONFIG = {
  favorites: {
    type: 'favorites',
    listKey: 'favoriteList',
    indexKey: 'favoriteIndex',
    listName: '收藏单词',
  },
  unknown: {
    type: 'unknown',
    listKey: 'unknownList',
    indexKey: 'unknownIndex',
    listName: '不认识单词',
  },
  fuzzy: {
    type: 'fuzzy',
    listKey: 'fuzzyList',
    indexKey: 'fuzzyIndex',
    listName: '模糊单词',
  },
};

/**
 * 从 location.state 中提取列表上下文
 * @param {object} locationState - location.state 对象
 * @returns {object|null} 列表上下文对象，如果不是列表模式则返回 null
 */
function extractListContext(locationState) {
  if (!locationState || !locationState.from) {
    return null;
  }

  const config = LIST_TYPE_CONFIG[locationState.from];
  if (!config) {
    return null;
  }

  const list = locationState[config.listKey];
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  return {
    type: config.type,
    list,
    index: locationState[config.indexKey] || 0,
    listName: config.listName,
  };
}

/**
 * 构建导航状态对象
 * @param {string} listType - 列表类型
 * @param {Array} list - 列表数据
 * @param {number} index - 当前索引
 * @returns {object} 导航状态对象
 */
function buildNavigateState(listType, list, index) {
  const config = LIST_TYPE_CONFIG[listType];
  if (!config) {
    return { from: listType };
  }

  return {
    from: listType,
    [config.listKey]: list,
    [config.indexKey]: index,
  };
}

function WordDetailPage() {
  const { category, index } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [word, setWord] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const fromStudy = searchParams.get('from') === 'study'; // 检测是否从学习页面跳转

  // 使用 useMemo 优化列表上下文的计算
  const listContext = useMemo(() => {
    return extractListContext(location.state);
  }, [location.state]);

  // 使用 useSpeech，传入当前单词作为 text
  const { start } = useSpeechConfig(word?.word || '');

  useEffect(() => {
    let isMounted = true;

    async function loadWords() {
      try {
        const categoryWords = await getWordsByCategory(category);
        if (isMounted) {
          setWords(categoryWords);
          const wordIndex = parseInt(index);
          setCurrentIndex(wordIndex);
          if (categoryWords[wordIndex]) {
            setWord(categoryWords[wordIndex]);
            // 滚动到顶部
            window.scrollTo(0, 0);
          }
        }
      } catch (error) {
        console.error('加载单词列表失败:', error);
        if (isMounted) {
          setWords([]);
        }
      }
    }

    loadWords();

    return () => {
      isMounted = false;
    };
  }, [category, index]);

  // 根据当前单词更新收藏状态
  useEffect(() => {
    if (word && category) {
      const favorite = isWordInList(WORD_LIST_TYPES.FAVORITE, word.word, category);
      setIsFavorite(favorite);
    } else {
      setIsFavorite(false);
    }
  }, [word, category]);

  const handleToggleFavorite = () => {
    if (!word || !category) return;
    const favorite = toggleWordInList(WORD_LIST_TYPES.FAVORITE, word.word, category);
    setIsFavorite(favorite);
  };

  /**
   * 在列表模式中导航到指定索引
   * @param {number} targetIndex - 目标索引
   * @param {string} errorMessage - 超出边界时的错误消息
   */
  const navigateInList = (targetIndex, errorMessage) => {
    if (!listContext || listContext.list.length === 0) {
      return false;
    }

    if (targetIndex < 0 || targetIndex >= listContext.list.length) {
      window.alert(errorMessage);
      return false;
    }

    const targetItem = listContext.list[targetIndex];
    const navigateState = buildNavigateState(
      listContext.type,
      listContext.list,
      targetIndex
    );

    navigate(`/detail/${targetItem.category}/${targetItem.index}`, {
      state: navigateState,
    });
    return true;
  };

  /**
   * 在普通模式中导航到指定索引
   * @param {number} targetIndex - 目标索引
   * @param {string} wrapAroundMessage - 循环导航的确认消息
   * @param {number} wrapAroundIndex - 循环导航的目标索引
   */
  const navigateInCategory = (targetIndex, wrapAroundMessage, wrapAroundIndex) => {
    if (fromStudy) {
      // 如果是从学习页面跳转来的，返回到学习页面
      navigate(`/study/${category}`);
      return;
    }

    if (targetIndex >= 0 && targetIndex < words.length) {
      navigate(`/detail/${category}/${targetIndex}`);
    } else if (wrapAroundMessage && window.confirm(wrapAroundMessage)) {
      navigate(`/detail/${category}/${wrapAroundIndex}`);
    }
  };

  const goToNextWord = () => {
    // 如果是从列表模式进入的，在列表中导航
    if (listContext) {
      const nextIndex = listContext.index + 1;
      const navigated = navigateInList(
        nextIndex,
        `已经是最后一个${listContext.listName}了`
      );
      if (navigated) return;
    }

    // 普通模式：在分类单词列表中导航
    const nextIndex = currentIndex + 1;
    navigateInCategory(
      nextIndex,
      '已经是最后一个单词了，是否从头开始？',
      0
    );
  };

  const goToPrevWord = () => {
    // 如果是从列表模式进入的，在列表中导航
    if (listContext) {
      const prevIndex = listContext.index - 1;
      const navigated = navigateInList(
        prevIndex,
        `已经是第一个${listContext.listName}了`
      );
      if (navigated) return;
    }

    // 普通模式：在分类单词列表中导航
    const prevIndex = currentIndex - 1;
    const lastIndex = words.length - 1;
    navigateInCategory(
      prevIndex,
      '已经是第一个单词了，是否跳转到最后一个？',
      lastIndex
    );
  };

  if (!word) {
    return (
      <div className="container">
        <Header
          title={fromStudy ? getCategoryName(category) : '单词详情'}
          showBack
        />
        <Loading text="加载中..." />
      </div>
    );
  }

  // 计算进度信息（当前索引和总数）
  const progressCurrent = listContext
    ? listContext.index + 1
    : currentIndex + 1;
  const progressTotal = listContext ? listContext.list.length : words.length;

  return (
    <div className="container">
      <Header
        title={fromStudy ? getCategoryName(category) : '单词详情'}
        showBack
        showProgress={fromStudy}
        currentIndex={progressCurrent}
        totalWords={progressTotal}
      />
      <WordDetailContent
        word={word}
        cssPrefix="word-detail"
        onPlaySound={start}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        progressCurrent={progressCurrent}
        progressTotal={progressTotal}
      />

      <footer className="detail-footer">
        <button
          className="btn btn-secondary"
          onClick={goToPrevWord}
          disabled={
            listContext
              ? listContext.index === 0
              : currentIndex === 0
          }
        >
          上一个
        </button>
        <button
          className="btn btn-primary"
          onClick={goToNextWord}
          disabled={
            listContext
              ? listContext.index === listContext.list.length - 1
              : currentIndex === words.length - 1
          }
        >
          下一个
        </button>
      </footer>
    </div>
  );
}

export default WordDetailPage;
