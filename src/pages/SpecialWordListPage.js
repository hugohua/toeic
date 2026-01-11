import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useSpeechConfig } from '../hooks/useSpeechConfig';
import Header from '../components/Header';
import { getWordList, WORD_LIST_TYPES } from '../services/storage';
import { getWordsByCategory } from '../services/api';
import { getFirstSlashContent } from '../utils/app';
import EtymologyBottomSheet from '../components/EtymologyBottomSheet';
import WordRow from '../components/WordRow';
import { toggleWordInList, WORD_LIST_TYPES as STORAGE_WORD_LIST_TYPES } from '../services/storage';
import Popup from '../components/Popup';
import '../index.css';
import './WordListPage.css';


// 列表类型配置
const LIST_TYPE_CONFIG = {
  [WORD_LIST_TYPES.FAVORITE]: {
    title: '收藏单词',
    emptyMessage: '还没有收藏任何单词哦～',
    countText: '个收藏单词',
    storagePrefix: 'favoritesPage',
    stateKey: 'favoriteList',
    stateIndexKey: 'favoriteIndex',
    fromValue: 'favorites', // WordDetailPage 期望的值
  },
  [WORD_LIST_TYPES.UNKNOWN]: {
    title: '不认识的单词',
    emptyMessage: '还没有标记不认识的单词哦～',
    countText: '个不认识的单词',
    storagePrefix: 'unknownWordsPage',
    stateKey: 'unknownList',
    stateIndexKey: 'unknownIndex',
    fromValue: 'unknown',
  },
  [WORD_LIST_TYPES.FUZZY]: {
    title: '模糊单词',
    emptyMessage: '还没有标记模糊的单词哦～',
    countText: '个模糊单词',
    storagePrefix: 'fuzzyWordsPage',
    stateKey: 'fuzzyList',
    stateIndexKey: 'fuzzyIndex',
    fromValue: 'fuzzy',
  },
};

function SpecialWordListPage() {
  const { listType } = useParams();
  const navigate = useNavigate();

  // 验证列表类型
  const config = LIST_TYPE_CONFIG[listType];
  if (!config) {
    return (
      <div className="container">
        <Header title="错误" showBack />
        <main className="word-list-content">
          <div className="empty-message">无效的列表类型</div>
        </main>
      </div>
    );
  }

  // 从 sessionStorage 恢复状态
  const storagePrefix = config.storagePrefix;
  const getStorageKey = (key) => `${storagePrefix}_${key}`;

  const [showAllMeanings, setShowAllMeanings] = useState(() => {
    const saved = sessionStorage.getItem(getStorageKey('showAllMeanings'));
    return saved ? JSON.parse(saved) : false;
  });

  const [meaningVisibility, setMeaningVisibility] = useState(() => {
    const saved = sessionStorage.getItem(getStorageKey('meaningVisibility'));
    return saved ? JSON.parse(saved) : {};
  });

  const [words, setWords] = useState([]);
  const [etymologyState, setEtymologyState] = useState({
    isOpen: false,
    word: '',
  });

  // 加载单词列表
  useEffect(() => {
    let isMounted = true;

    async function loadWords() {
      const list = await getWordList(listType);
      if (list.length === 0) {
        setWords([]);
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
          setWords(results);
        }
      } catch (error) {
        console.error(`加载${config.title}失败:`, error);
        if (isMounted) {
          setWords([]);
        }
      }
    }

    loadWords();

    return () => {
      isMounted = false;
    };
  }, [listType, config.title]);

  // 保存释义显示状态到 sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      getStorageKey('showAllMeanings'),
      JSON.stringify(showAllMeanings)
    );
  }, [showAllMeanings, storagePrefix]);

  useEffect(() => {
    sessionStorage.setItem(
      getStorageKey('meaningVisibility'),
      JSON.stringify(meaningVisibility)
    );
  }, [meaningVisibility, storagePrefix]);

  // 恢复滚动位置
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem(getStorageKey('scrollPos'));
    if (savedScrollPos) {
      // 使用 setTimeout 确保 DOM 已渲染
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPos));
      }, 0);
    }
  }, [storagePrefix]);

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
  }, [storagePrefix]);

  const handleRowClick = (clickedIndex) => {
    if (!words || words.length === 0) return;

    // 跳转前保存当前滚动位置
    sessionStorage.setItem(
      getStorageKey('scrollPos'),
      window.scrollY.toString()
    );

    const listState = words.map((item) => ({
      word: item.word,
      category: item.category,
      index: item.index,
    }));

    const item = words[clickedIndex];
    navigate(`/detail/${item.category}/${item.index}`, {
      state: {
        from: config.fromValue,
        [config.stateKey]: listState,
        [config.stateIndexKey]: clickedIndex,
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

  const handleEtymologyClick = (word) => {
    setEtymologyState({ isOpen: true, word });
  };

  const handleToggleFavorite = async (e, wordText) => {
    e.stopPropagation();

    // 找到对应的单词项以获取 category
    const wordItem = words.find(w => w.word === wordText);
    if (!wordItem) return;

    const category = wordItem.category;
    const isFavorite = await toggleWordInList(STORAGE_WORD_LIST_TYPES.FAVORITE, wordText, category);

    // 显示提示
    Popup.show(isFavorite ? '已收藏' : '已取消收藏');

    // 如果是在收藏列表，且取消收藏，需要实时更新列表
    if (listType === WORD_LIST_TYPES.FAVORITE && !isFavorite) {
      setWords((prev) => prev.filter((w) => w.word !== wordText));
    }
  };

  const handleStartPlaylist = () => {
    // Extract actual word data
    const playlist = words.map(item => item.data || item);
    navigate('/playlist', { state: { list: playlist } });
  };

  if (words.length === 0) {
    return (
      <div className="container">
        <Header title={config.title} showBack />
        <main className="word-list-content">
          <div className="empty-message">{config.emptyMessage}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title={config.title} showBack />
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
                      className={`meaning-toggle-btn icon-btn-small ${showAllMeanings ? 'active' : ''}`}
                      onClick={handleToggleAllMeanings}
                      title={
                        showAllMeanings
                          ? '隐藏所有单词解释'
                          : '显示所有单词解释'
                      }
                    >
                      <Eye size={16} />
                    </button>
                  </span>
                </th>
                <th className="col-favorite">操作</th>
              </tr>
            </thead>
            <tbody>
              {words.map((item, index) => {
                // 构造 WordRow 需要的 word 对象
                // item 是 SpecialList 中的项，item.data 是完整的单词数据
                // 需要确保传给 WordRow 的对象有 word, phonetic, coreMeaning 等字段
                const wordData = item.data || item;

                // 确定 isFavorite
                // 如果是收藏列表，默认为 true (除非组件内状态被更新了)
                // 其他列表则需要检查 storage。
                // 但为了简化，我们在 initial load 时或者 toggle 时应该已经更新了 item 的属性。
                // 这里我们做一个动态检查：
                // 注意：这里不能用 async/await，因为在 render 中。改为从当前 words 列表检查
                const isFav = listType === WORD_LIST_TYPES.FAVORITE ||
                  (item.data && item.data.isFavorite);

                return (
                  <WordRow
                    key={`${item.category}-${item.word}-${index}`}
                    word={wordData}
                    index={index}
                    isFavorite={isFav}
                    isMeaningVisible={isMeaningVisible(index)}
                    onRowClick={handleRowClick}
                    onMeaningToggle={handleMeaningToggle}
                    onToggleFavorite={handleToggleFavorite}
                    getShortMeaning={getShortMeaning}
                    onEtymologyClick={handleEtymologyClick}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="word-list-footer">
          <div className="word-count">共 {words.length} {config.countText}</div>
          <button
            className="btn btn-primary word-list-footer-btn"
            onClick={handleStartPlaylist}
            style={{ marginTop: '10px', width: '100%' }}
          >
            随身听
          </button>
        </div>

        <EtymologyBottomSheet
          isOpen={etymologyState.isOpen}
          onClose={() => setEtymologyState({ ...etymologyState, isOpen: false })}
          word={etymologyState.word}
        />
      </main>
    </div>
  );
}

export default SpecialWordListPage;

