import React, { useState, useEffect, useMemo } from 'react';
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom';
import { useSpeechConfig } from '../hooks/useSpeechConfig';
import { getWordByIndex, getWordsByCategory } from '../services/api';
import Header from '../components/Header';
import WordDetailContent from '../components/WordDetailContent';
import Loading from '../components/Loading';
import { getCategoryName } from '../utils/app';
import {
  getWordList,
  toggleWordInList,
  WORD_LIST_TYPES,
} from '../services/storage';
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
  const [totalCount, setTotalCount] = useState(0);
  const [wordsCache, setWordsCache] = useState({}); // 窗口缓存: {index: wordData}
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteWords, setFavoriteWords] = useState(new Set()); // 缓存收藏列表
  const fromStudy = searchParams.get('from') === 'study'; // 检测是否从学习页面跳转
  const currentIndex = parseInt(index);

  // 使用 useMemo 优化列表上下文的计算
  const listContext = useMemo(() => {
    return extractListContext(location.state);
  }, [location.state]);

  // 使用 useSpeech，传入当前单词作为 text
  const { start, stop, isPlaying, isLoading } = useSpeechConfig(word?.word || '');

  const handlePlaySound = () => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  };

  // 加载收藏列表缓存
  useEffect(() => {
    let isMounted = true;

    async function loadFavorites() {
      try {
        const list = await getWordList(WORD_LIST_TYPES.FAVORITE, category);
        if (isMounted) {
          const wordSet = new Set(list.map(item => item.word));
          setFavoriteWords(wordSet);
        }
      } catch (error) {
        console.error('加载收藏列表失败:', error);
      }
    }

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [category]);

  useEffect(() => {
    let isMounted = true;

    async function loadWord() {
      try {
        // 先检查缓存
        if (wordsCache[currentIndex]) {
          setWord(wordsCache[currentIndex]);
          setTotalCount(wordsCache[currentIndex].totalCount);
          window.scrollTo(0, 0);
          return;
        }

        // 加载当前单词以获取总数
        const wordData = await getWordByIndex(category, currentIndex);
        if (!isMounted) return;

        if (wordData) {
          setWord(wordData);
          setTotalCount(wordData.totalCount);
          window.scrollTo(0, 0);

          // 计算窗口范围:当前索引前后各10个单词(共约20个)
          const WINDOW_SIZE = 10;
          const startIndex = Math.max(0, currentIndex - WINDOW_SIZE);
          const limit = Math.min(WINDOW_SIZE * 2 + 1, wordData.totalCount - startIndex);

          // 使用现有API加载窗口内的单词
          getWordsByCategory(category, limit, startIndex).then(words => {
            if (!isMounted) return;

            // 构建缓存对象
            const newCache = {};
            words.forEach((w, idx) => {
              const wordIndex = startIndex + idx;
              newCache[wordIndex] = {
                ...w,
                totalCount: wordData.totalCount,
              };
            });

            setWordsCache(prev => ({
              ...prev,
              ...newCache,
            }));
          }).catch(error => {
            console.error('加载窗口单词失败:', error);
          });
        }
      } catch (error) {
        console.error('加载单词失败:', error);
        if (isMounted) {
          setWord(null);
        }
      }
    }

    loadWord();

    return () => {
      isMounted = false;
    };
  }, [category, currentIndex]);

  // 根据当前单词更新收藏状态（本地检查）
  useEffect(() => {
    if (word) {
      setIsFavorite(favoriteWords.has(word.word));
    } else {
      setIsFavorite(false);
    }
  }, [word, favoriteWords]);

  const handleToggleFavorite = async () => {
    if (!word || !category) return;
    const favorite = await toggleWordInList(WORD_LIST_TYPES.FAVORITE, word.word, category);

    // 同步更新本地缓存
    setFavoriteWords(prev => {
      const newSet = new Set(prev);
      if (favorite) {
        newSet.add(word.word);
      } else {
        newSet.delete(word.word);
      }
      return newSet;
    });

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

    if (targetIndex >= 0 && targetIndex < totalCount) {
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
    const lastIndex = totalCount - 1;
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
  const progressTotal = listContext ? listContext.list.length : totalCount;

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
        mode="page"
        cssPrefix="word-detail"
        onPlaySound={handlePlaySound}
        isPlayingSound={isPlaying}
        isLoadingSound={isLoading}
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
              : currentIndex === totalCount - 1
          }
        >
          下一个
        </button>
      </footer>
    </div>
  );
}

export default WordDetailPage;
