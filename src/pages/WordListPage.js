import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpeech } from 'react-text-to-speech';
import { wordData } from '../data';
import Header from '../components/Header';
import { getCategoryName } from '../utils/app';
import * as storage from '../utils/storage';
import '../index.css';
import './WordListPage.css';

// 行内单词发音组件，避免全局 state 导致的“上一词”问题
function WordSpeaker({ wordText, isFavorite }) {
  const { start } = useSpeech({
    text: wordText || '',
    pitch: 1,
    rate: 1,
    volume: 1,
  });

  return (
    <span
      className={`word-list-text ${isFavorite ? 'word-favorite' : ''}`}
      onClick={(e) => {
        e.stopPropagation(); // 阻止触发行点击
        start();
      }}
      style={{ cursor: 'pointer' }}
      title="点击播放发音"
    >
      {wordText}
    </span>
  );
}

function WordListPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  
  // 从 sessionStorage 恢复状态
  const getStorageKey = (key) => `wordList_${category}_${key}`;
  
  const [showAllMeanings, setShowAllMeanings] = useState(() => {
    const saved = sessionStorage.getItem(getStorageKey('showAllMeanings'));
    return saved ? JSON.parse(saved) : false;
  });
  
  const [meaningVisibility, setMeaningVisibility] = useState(() => {
    const saved = sessionStorage.getItem(getStorageKey('meaningVisibility'));
    return saved ? JSON.parse(saved) : {};
  });
  
  const [favoriteWords, setFavoriteWords] = useState(new Set());

  // 初始化收藏状态
  useEffect(() => {
    const list = storage.getFavoriteWords();
    const set = new Set();
    list.forEach((item) => {
      if (item && item.word && item.category) {
        set.add(`${item.category}-${item.word}`);
      }
    });
    setFavoriteWords(set);
  }, []);

  const favoriteKeySet = useMemo(() => {
    return favoriteWords;
  }, [favoriteWords]);

  // 加载单词列表
  useEffect(() => {
    const categoryWords = wordData[category] || [];
    setWords(categoryWords);
  }, [category]);

  // 保存释义显示状态到 sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      getStorageKey('showAllMeanings'),
      JSON.stringify(showAllMeanings)
    );
  }, [showAllMeanings, category]);

  useEffect(() => {
    sessionStorage.setItem(
      getStorageKey('meaningVisibility'),
      JSON.stringify(meaningVisibility)
    );
  }, [meaningVisibility, category]);

  // 恢复滚动位置
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem(getStorageKey('scrollPos'));
    if (savedScrollPos) {
      // 使用 setTimeout 确保 DOM 已渲染
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPos));
      }, 0);
    }
  }, [category]);

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
  }, [category]);

  const handleRowClick = (index) => {
    // 跳转前保存当前滚动位置
    sessionStorage.setItem(
      getStorageKey('scrollPos'),
      window.scrollY.toString()
    );
    navigate(`/detail/${category}/${index}`);
  };

  const handleStartStudy = () => {
    navigate(`/study/${category}`);
  };

  // 判断某一行释义是否可见（支持全局开关 + 单行手动开关）
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
  const handleMeaningCellClick = (e, index) => {
    // 阻止触发行的跳转
    e.stopPropagation();
    const current = isMeaningVisible(index);
    setMeaningVisibility((prev) => ({
      ...prev,
      [index]: !current,
    }));
  };

  // 切换单词收藏状态
  const handleToggleFavorite = (e, word) => {
    e.stopPropagation(); // 阻止触发行点击
    storage.toggleFavoriteWord(word, category);
    
    // 更新本地状态以实时反映UI变化
    const key = `${category}-${word}`;
    setFavoriteWords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getPartOfSpeech = (word) => {
    if (word.partOfSpeech) {
      // 提取简短的词性，如 "n. 名词" -> "n."
      const match = word.partOfSpeech.match(/^([nvadjadv]\.?)/i);
      return match ? match[1] : word.partOfSpeech.split(' ')[0];
    }
    // 如果没有partOfSpeech，尝试从coreMeaning中提取
    const meaning = word.coreMeaning || '';
    const match = meaning.match(/^([nvadjadv]\.?\s*[^；，。]+)/);
    return match ? match[1].trim() : '-';
  };

  const getShortMeaning = (word) => {
    let meaning = word.coreMeaning || '';

    // 如果有partOfSpeech，从coreMeaning中移除词性部分
    // if (word.partOfSpeech) {
    //   // 移除词性前缀（如 "n. 名词" 或类似格式）
    //   meaning = meaning.replace(/^[nvadjadv]\.?\s*[^；，。]+[；，。]?\s*/, '');
    // }

    // // 如果还有分号或逗号，取第一部分
    // if (meaning.includes('；') || meaning.includes('，')) {
    //   meaning = meaning.split(/[；，]/)[0];
    // }

    // // 移除括号中的详细说明（保留核心意思）
    // meaning = meaning.replace(/（[^）]*）/g, '');
    // meaning = meaning.replace(/\([^)]*\)/g, '');

    // // 限制长度
    // if (meaning.length > 60) {
    //   meaning = meaning.substring(0, 60) + '...';
    // }

    return meaning.trim() || '-';
  };

  if (words.length === 0) {
    return (
      <div className="container">
        <Header title={`${getCategoryName(category)} - 单词列表`} showBack />
        <main className="word-list-content">
          <div className="empty-message">该分类暂无单词</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title={`${getCategoryName(category)} - 单词列表`} showBack />
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
                <th className="col-favorite">收藏</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, index) => {
                const isFavorited = favoriteKeySet.has(`${category}-${word.word}`);
                return (
                  <tr
                    key={`${word.word}-${index}`}
                    className="word-list-row"
                    onClick={() => handleRowClick(index)}
                  >
                    <td className="col-word">
                      <WordSpeaker
                        wordText={word.word}
                        isFavorite={isFavorited}
                      />
                    </td>
                    <td
                      className="col-meaning"
                      onClick={(e) => handleMeaningCellClick(e, index)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="meaning-text">
                        {isMeaningVisible(index)
                          ? getShortMeaning(word)
                          : '点击显示释义'}
                      </span>
                    </td>
                    <td className="col-favorite">
                      <button
                        type="button"
                        className={`list-favorite-btn ${
                          isFavorited ? 'favorited' : ''
                        }`}
                        onClick={(e) => handleToggleFavorite(e, word.word)}
                        title={isFavorited ? '取消收藏' : '收藏单词'}
                      >
                        <span className="favorite-icon">
                          {isFavorited ? '★' : '☆'}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="word-list-footer">
          <div className="word-count">共 {words.length} 个单词</div>
          <button
            className="btn btn-primary"
            onClick={handleStartStudy}
            style={{ marginTop: '10px' }}
          >
            开始背单词
          </button>
        </div>
      </main>
    </div>
  );
}

export default WordListPage;
