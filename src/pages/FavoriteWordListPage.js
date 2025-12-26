import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpeech } from 'react-text-to-speech';
import Header from '../components/Header';
import { getFavoriteWords } from '../utils/storage';
import { getWordsByCategory } from '../utils/api';
import { getCategoryName, getFirstSlashContent } from '../utils/app';
import '../index.css';
import './WordListPage.css';

// 收藏单词行组件，包含发音、释义显示功能
function FavoriteWordRow({
  item,
  index,
  isMeaningVisible,
  onRowClick,
  onMeaningToggle,
  getShortMeaning,
}) {
  const { start } = useSpeech({
    text: item.word || '',
    pitch: 1,
    rate: 1,
    volume: 1,
  });

  const handleWordClick = (e) => {
    e.stopPropagation();
    start();
  };

  const handleMeaningCellClick = (e) => {
    e.stopPropagation();
    // 点击释义时播放单词声音
    start();
    // 切换释义显示状态
    onMeaningToggle(index);
  };

  return (
    <tr className="word-list-row" onClick={() => onRowClick(index)}>
      <td className="col-word">
        <span
          className="word-list-text word-favorite word-list-clickable"
          onClick={handleWordClick}
          title="点击播放发音"
        >
          {item.word}
          <span className="word-phonetic">
            {getFirstSlashContent(item.phonetic)}
          </span>
        </span>
      </td>
      <td
        className="col-meaning word-list-meaning-clickable"
        onClick={handleMeaningCellClick}
      >
        <span className="meaning-text">
          {isMeaningVisible ? getShortMeaning(item.data || {}) : '点击显示释义'}
        </span>
      </td>
    </tr>
  );
}

function FavoriteWordListPage() {
  const navigate = useNavigate();

  // 从 sessionStorage 恢复状态
  const getStorageKey = (key) => `favoritesPage_${key}`;

  const [showAllMeanings, setShowAllMeanings] = useState(() => {
    const saved = sessionStorage.getItem(getStorageKey('showAllMeanings'));
    return saved ? JSON.parse(saved) : false;
  });

  const [meaningVisibility, setMeaningVisibility] = useState(() => {
    const saved = sessionStorage.getItem(getStorageKey('meaningVisibility'));
    return saved ? JSON.parse(saved) : {};
  });

  const [favoriteWords, setFavoriteWords] = useState([]);

  // 加载收藏单词列表
  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteWords() {
      const list = getFavoriteWords();
      if (list.length === 0) {
        setFavoriteWords([]);
        return;
      }

      try {
        // 按分类分组
        const categoryMap = new Map();
        list.forEach((item) => {
          if (!categoryMap.has(item.category)) {
            categoryMap.set(item.category, []);
          }
          categoryMap.get(item.category).push(item);
        });

        // 为每个分类获取单词列表
        const results = [];
        for (const [category, items] of categoryMap.entries()) {
          try {
            const categoryWords = await getWordsByCategory(category);
            items.forEach((item) => {
              const index = categoryWords.findIndex(
                (w) => w.word === item.word
              );
              if (index !== -1) {
                const word = categoryWords[index];
                results.push({
                  ...item,
                  index,
                  data: word,
                });
              }
            });
          } catch (error) {
            console.error(`加载分类 ${category} 失败:`, error);
          }
        }

        if (isMounted) {
          setFavoriteWords(results);
        }
      } catch (error) {
        console.error('加载收藏单词失败:', error);
        if (isMounted) {
          setFavoriteWords([]);
        }
      }
    }

    loadFavoriteWords();

    return () => {
      isMounted = false;
    };
  }, []);

  // 保存释义显示状态到 sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      getStorageKey('showAllMeanings'),
      JSON.stringify(showAllMeanings)
    );
  }, [showAllMeanings]);

  useEffect(() => {
    sessionStorage.setItem(
      getStorageKey('meaningVisibility'),
      JSON.stringify(meaningVisibility)
    );
  }, [meaningVisibility]);

  // 恢复滚动位置
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem(getStorageKey('scrollPos'));
    if (savedScrollPos) {
      // 使用 setTimeout 确保 DOM 已渲染
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPos));
      }, 0);
    }
  }, []);

  // 保存滚动位置
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(
        getStorageKey('scrollPos'),
        window.scrollY.toString()
      );
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRowClick = (clickedIndex) => {
    if (!favoriteWords || favoriteWords.length === 0) return;

    // 跳转前保存当前滚动位置
    sessionStorage.setItem(
      getStorageKey('scrollPos'),
      window.scrollY.toString()
    );

    const favoriteListState = favoriteWords.map((item) => ({
      word: item.word,
      category: item.category,
      index: item.index,
    }));

    const item = favoriteWords[clickedIndex];
    navigate(`/detail/${item.category}/${item.index}`, {
      state: {
        from: 'favorites',
        favoriteList: favoriteListState,
        favoriteIndex: clickedIndex,
      },
    });
  };

  // 判断某一行释义是否可见
  const isMeaningVisible = (index) => {
    if (Object.prototype.hasOwnProperty.call(meaningVisibility, index)) {
      return meaningVisibility[index];
    }
    return showAllMeanings;
  };

  // 列头「眼睛」图标：切换全部释义显示/隐藏
  const handleToggleAllMeanings = (e) => {
    e.stopPropagation();
    setShowAllMeanings((prev) => !prev);
    // 重置单行手动开关，让全局开关统一生效
    setMeaningVisibility({});
  };

  // 单词释义单元格点击：只切换当前行
  const handleMeaningToggle = (index) => {
    const current = isMeaningVisible(index);
    setMeaningVisibility((prev) => ({
      ...prev,
      [index]: !current,
    }));
  };

  const getShortMeaning = (word) => {
    let meaning = word.coreMeaning || '';
    return meaning.trim() || '-';
  };

  if (favoriteWords.length === 0) {
    return (
      <div className="container">
        <Header title="收藏单词" showBack />
        <main className="word-list-content">
          <div className="empty-message">还没有收藏任何单词哦～</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="收藏单词" showBack />
      <main className="word-list-content">
        <div className="word-list-table-container">
          <table className="word-list-table">
            <thead>
              <tr>
                <th className="col-word">单词</th>
                <th className="col-meaning">
                  <span className="meaning-header">
                    <span>解释</span>
                    <button
                      type="button"
                      className={`meaning-toggle-btn ${
                        showAllMeanings ? 'active' : ''
                      }`}
                      onClick={handleToggleAllMeanings}
                      title={
                        showAllMeanings
                          ? '隐藏所有单词解释'
                          : '显示所有单词解释'
                      }
                    >
                      👁
                    </button>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {favoriteWords.map((item, index) => (
                <FavoriteWordRow
                  key={`${item.category}-${item.word}-${index}`}
                  item={item}
                  index={index}
                  isMeaningVisible={isMeaningVisible(index)}
                  onRowClick={handleRowClick}
                  onMeaningToggle={handleMeaningToggle}
                  getShortMeaning={getShortMeaning}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="word-list-footer">
          <div className="word-count">共 {favoriteWords.length} 个收藏单词</div>
        </div>
      </main>
    </div>
  );
}

export default FavoriteWordListPage;
