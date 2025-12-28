import React, { useState, useEffect } from 'react';
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom';
import { useSpeechConfig } from '../utils/hooks';
import { getWordsByCategory } from '../utils/api';
import Header from '../components/Header';
import PhraseCell from '../components/PhraseCell';
import ExampleSentence from '../components/ExampleSentence';
import ConfusingWordCell from '../components/ConfusingWordCell';
import { getCategoryName } from '../utils/app';
import { formatKeyCollocations } from '../utils/text';
import {
  isWordInList,
  toggleWordInList,
  WORD_LIST_TYPES,
} from '../utils/storage';
import '../index.css';
import './WordDetailPage.css';

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

  const favoritesState = location.state || {};
  const isFromFavorites =
    favoritesState.from === 'favorites' &&
    Array.isArray(favoritesState.favoriteList);
  const favoriteList = isFromFavorites ? favoritesState.favoriteList : [];
  const favoriteIndex = isFromFavorites ? favoritesState.favoriteIndex || 0 : 0;

  const unknownState = location.state || {};
  const isFromUnknown =
    unknownState.from === 'unknown' &&
    Array.isArray(unknownState.unknownList);
  const unknownList = isFromUnknown ? unknownState.unknownList : [];
  const unknownIndex = isFromUnknown ? unknownState.unknownIndex || 0 : 0;

  const fuzzyState = location.state || {};
  const isFromFuzzy =
    fuzzyState.from === 'fuzzy' &&
    Array.isArray(fuzzyState.fuzzyList);
  const fuzzyList = isFromFuzzy ? fuzzyState.fuzzyList : [];
  const fuzzyIndex = isFromFuzzy ? fuzzyState.fuzzyIndex || 0 : 0;

  // 确定当前页面上下文（来自哪个列表或普通模式）
  const listContext = isFromFavorites
    ? {
        type: 'favorites',
        list: favoriteList,
        index: favoriteIndex,
        listName: '收藏单词',
      }
    : isFromUnknown
    ? {
        type: 'unknown',
        list: unknownList,
        index: unknownIndex,
        listName: '不认识单词',
      }
    : isFromFuzzy
    ? {
        type: 'fuzzy',
        list: fuzzyList,
        index: fuzzyIndex,
        listName: '模糊单词',
      }
    : null;

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

  const goToNextWord = () => {
    // 如果是从列表模式进入的，在列表中导航
    if (listContext && listContext.list.length > 0) {
      const nextIndex = listContext.index + 1;
      if (nextIndex < listContext.list.length) {
        const nextItem = listContext.list[nextIndex];
        
        // 根据列表类型构建导航状态
        const navigateState = { from: listContext.type };
        if (listContext.type === 'favorites') {
          navigateState.favoriteList = listContext.list;
          navigateState.favoriteIndex = nextIndex;
        } else if (listContext.type === 'unknown') {
          navigateState.unknownList = listContext.list;
          navigateState.unknownIndex = nextIndex;
        } else if (listContext.type === 'fuzzy') {
          navigateState.fuzzyList = listContext.list;
          navigateState.fuzzyIndex = nextIndex;
        }
        
        navigate(`/detail/${nextItem.category}/${nextItem.index}`, {
          state: navigateState,
        });
      } else {
        window.alert(`已经是最后一个${listContext.listName}了`);
      }
      return;
    }

    // 普通模式：在分类单词列表中导航
    const nextIndex = currentIndex + 1;
    if (fromStudy) {
      // 如果是从学习页面跳转来的，返回到学习页面
      // 让学习页面自己处理下一个单词的逻辑（它会自动检查是否完成并生成新组）
      navigate(`/study/${category}`);
    } else {
      // 否则在详情页之间切换
      if (nextIndex < words.length) {
        navigate(`/detail/${category}/${nextIndex}`);
      } else {
        if (window.confirm('已经是最后一个单词了，是否从头开始？')) {
          navigate(`/detail/${category}/0`);
        }
      }
    }
  };

  const goToPrevWord = () => {
    // 如果是从列表模式进入的，在列表中导航
    if (listContext && listContext.list.length > 0) {
      const prevIndex = listContext.index - 1;
      if (prevIndex >= 0) {
        const prevItem = listContext.list[prevIndex];
        
        // 根据列表类型构建导航状态
        const navigateState = { from: listContext.type };
        if (listContext.type === 'favorites') {
          navigateState.favoriteList = listContext.list;
          navigateState.favoriteIndex = prevIndex;
        } else if (listContext.type === 'unknown') {
          navigateState.unknownList = listContext.list;
          navigateState.unknownIndex = prevIndex;
        } else if (listContext.type === 'fuzzy') {
          navigateState.fuzzyList = listContext.list;
          navigateState.fuzzyIndex = prevIndex;
        }
        
        navigate(`/detail/${prevItem.category}/${prevItem.index}`, {
          state: navigateState,
        });
      } else {
        window.alert(`已经是第一个${listContext.listName}了`);
      }
      return;
    }

    // 普通模式：在分类单词列表中导航
    const prevIndex = currentIndex - 1;
    if (fromStudy) {
      // 如果是从学习页面跳转来的，返回到学习页面
      // 让学习页面自己处理上一个单词的逻辑
      navigate(`/study/${category}`);
    } else {
      // 否则在详情页之间切换
      if (prevIndex >= 0) {
        navigate(`/detail/${category}/${prevIndex}`);
      } else {
        if (window.confirm('已经是第一个单词了，是否跳转到最后一个？')) {
          const lastIndex = words.length - 1;
          navigate(`/detail/${category}/${lastIndex}`);
        }
      }
    }
  };

  if (!word) {
    return <div>加载中...</div>;
  }

  const coreMeaning =
    word.coreMeaning ||
    (word.partOfSpeech ? `${word.partOfSpeech} ${word.coreMeaning}` : '暂无');
  const toeicSceneFocus = word.toeicSceneFocus || word.sceneFocus || '暂无';

  // 计算进度信息（当前索引和总数）
  const progressCurrent = listContext
    ? listContext.index + 1
    : currentIndex + 1;
  const progressTotal = listContext ? listContext.list.length : words.length;

  const keyCollocationsHtml = formatKeyCollocations(word.keyCollocations || word.usageCollocation);

  // 渲染TOEIC例句组件
  const renderExampleSentences = () => {
    if (
      word.toeicExampleSentences &&
      Array.isArray(word.toeicExampleSentences) &&
      word.toeicExampleSentences.length > 0
    ) {
      return (
        <ol>
          {word.toeicExampleSentences.map((sent, index) => (
              <li key={index}>
                <ExampleSentence sentence={sent} className="word-detail-example-sentence" />
              </li>
          ))}
        </ol>
      );
    } else {
      return <p className="word-detail-empty-text">暂无例句</p>;
    }
  };

  // 渲染易混淆词区分组件
  const renderConfusingWords = () => {
    if (
      word.confusingWordsComparison &&
      Array.isArray(word.confusingWordsComparison) &&
      word.confusingWordsComparison.length > 0
    ) {
      return (
        <table className="confusing-words-table">
          <thead>
            <tr>
              <th>单词</th>
              <th>核心区别</th>
              <th>TOEIC场景重点</th>
            </tr>
          </thead>
          <tbody>
            {word.confusingWordsComparison.map((item, index) => (
              <tr key={index}>
                <td>
                  <ConfusingWordCell wordText={item.word} className="word-detail-clickable" />
                </td>
                <td>{item.coreDifference}</td>
                <td>{item.toeicSceneFocus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (word.confusionDistinction) {
      // 如果存在 confusionDistinction 字符串，使用 dangerouslySetInnerHTML 作为后备
      return (
        <div dangerouslySetInnerHTML={{ __html: word.confusionDistinction }} />
      );
    } else {
      return <div>暂无</div>;
    }
  };

  return (
    <div className="container">
      <Header
        title={fromStudy ? getCategoryName(category) : '单词详情'}
        showBack
        showProgress={fromStudy}
        currentIndex={progressCurrent}
        totalWords={progressTotal}
      />
      <main className="detail-content">
        <div className="detail-card">
          <div className="detail-header">
            <div className="detail-header-main">
              <div
                className="word-title word-detail-title-clickable"
                onClick={() => {
                  start();
                }}
                title="点击播放发音"
              >
                {word.word}
              </div>
              <button
                type="button"
                className={`favorite-btn ${isFavorite ? 'favorite-btn-active' : ''}`}
                onClick={handleToggleFavorite}
                title={isFavorite ? '取消收藏该单词' : '收藏该单词'}
              >
                <span className="favorite-icon">{isFavorite ? '★' : '☆'}</span>
              </button>
            </div>
            <div className="phonetic">{word.phonetic || '/ˈwɜːrd/'}</div>
            <div className="word-progress">
              {progressCurrent} / {progressTotal}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">核心释义</h3>
            <div
              className="section-content"
              dangerouslySetInnerHTML={{ __html: coreMeaning }}
            />
          </div>

          <div className="detail-section">
            <h3 className="section-title">短语短句</h3>
            <div className="section-content">
              {word.phrase ? (
                <PhraseCell phraseText={word.phrase} />
              ) : (
                <p className="word-detail-empty-text">暂无</p>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">TOEIC场景重点</h3>
            <div
              className="section-content"
              dangerouslySetInnerHTML={{ __html: toeicSceneFocus }}
            />
          </div>

          <div className="detail-section">
            <h3 className="section-title">关键搭配</h3>
            <div
              className="section-content"
              dangerouslySetInnerHTML={{ __html: keyCollocationsHtml }}
            />
          </div>

          <div className="detail-section">
            <h3 className="section-title">TOEIC例句</h3>
            <div className="section-content">{renderExampleSentences()}</div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">场景联想</h3>
            <div
              className="section-content"
              dangerouslySetInnerHTML={{
                __html: word.sceneAssociation || '暂无',
              }}
            />
          </div>

          <div className="detail-section">
            <h3 className="section-title">易混淆词区分</h3>
            <div className="section-content">{renderConfusingWords()}</div>
          </div>
        </div>
      </main>

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
