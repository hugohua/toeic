import React, { useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import WordRow from '../components/WordRow';
import { getCategoryName } from '../utils/app';
import {
  useWordListPagination,
  useWordListSettings,
  useFavoriteWords
} from '../hooks/useWordList';
import '../index.css';
import './WordListPage.css';
import EtymologyBottomSheet from '../components/EtymologyBottomSheet';
import Loading from '../components/Loading';

function WordListPage() {
  const { category } = useParams();
  const navigate = useNavigate();

  // Custom Hooks
  const {
    words,
    loading,
    hasMore,
    loadMore,
    saveScrollPosition
  } = useWordListPagination(category);

  const {
    showAllMeanings,
    toggleAllMeanings,
    toggleMeaning,
    isMeaningVisible
  } = useWordListSettings(category);

  const {
    isFavorited,
    toggleFavorite
  } = useFavoriteWords(category);

  const [etymologyConfig, setEtymologyConfig] = React.useState({
    isOpen: false,
    word: ''
  });

  // Intersection Observer implementation for infinite scroll
  const sentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [loadMore, hasMore, loading]);

  // Handlers
  const handleRowClick = useCallback((index) => {
    saveScrollPosition();
    navigate(`/detail/${category}/${index}`);
  }, [category, navigate, saveScrollPosition]);

  const handleStartStudy = useCallback(() => {
    navigate(`/study/${category}`);
  }, [category, navigate]);

  const handleToggleFavorite = useCallback((e, word) => {
    e.stopPropagation();
    toggleFavorite(word);
  }, [toggleFavorite]);

  const getShortMeaning = useCallback((word) => {
    let meaning = word.coreMeaning || '';
    return meaning.trim() || '-';
  }, []);

  const handleEtymologyClick = useCallback((wordStr) => {
    setEtymologyConfig({
      isOpen: true,
      word: wordStr
    });
  }, []);

  const handleCloseEtymology = useCallback(() => {
    setEtymologyConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  if (words.length === 0 && !loading) {
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
                      className={`meaning-toggle-btn ${showAllMeanings ? 'active' : ''}`}
                      onClick={toggleAllMeanings}
                      title={showAllMeanings ? '隐藏所有单词解释' : '显示所有单词解释'}
                    >
                      <span className="iconfont icon-eye"></span>
                    </button>
                  </span>
                </th>
                <th className="col-favorite">操作</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, index) => (
                <WordRow
                  key={`${word.word}-${index}`}
                  word={word}
                  index={index}
                  category={category}
                  isFavorite={isFavorited(word.word)}
                  isMeaningVisible={isMeaningVisible(index)}
                  onRowClick={handleRowClick}
                  onMeaningToggle={toggleMeaning}
                  onToggleFavorite={handleToggleFavorite}
                  getShortMeaning={getShortMeaning}
                  onEtymologyClick={handleEtymologyClick}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Loading Sentinel */}
        <div
          className="loading-sentinel"
          ref={sentinelRef}
          style={{
            height: '40px',
            textAlign: 'center',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {loading && <Loading text="加载中..." className="word-list-loading" />}
          {!hasMore && words.length > 0 && (
            <span style={{ color: '#999', fontSize: '12px' }}>—— 到底了 ——</span>
          )}
        </div>

        <div className="word-list-footer">
          <div className="word-count">已加载 {words.length} 个单词</div>
          <button
            className="btn btn-primary word-list-footer-btn"
            onClick={handleStartStudy}
          >
            开始背单词
          </button>
        </div>
      </main>

      <EtymologyBottomSheet
        isOpen={etymologyConfig.isOpen}
        onClose={handleCloseEtymology}
        word={etymologyConfig.word}
      />
    </div>
  );
}

export default WordListPage;
