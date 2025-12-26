import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpeechConfig } from '../utils/hooks';
import { getWordsByCategory } from '../utils/api';
import Header from '../components/Header';
import PhraseCell from '../components/PhraseCell';
import ExampleSentence from '../components/ExampleSentence';
import ConfusingWordCell from '../components/ConfusingWordCell';
import { getCategoryName } from '../utils/app';
import { formatKeyCollocations } from '../utils/text';
import * as storage from '../utils/storage';
import '../index.css';
import './WordBrowsePage.css';

function WordBrowsePage() {
  const { category } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const browseContentRef = useRef(null);

  // 使用 useSpeech，传入当前单词作为 text
  const { start } = useSpeechConfig(currentWord?.word || '');

  useEffect(() => {
    let isMounted = true;

    async function loadWords() {
      try {
        const categoryWords = await getWordsByCategory(category);
        if (isMounted) {
          setWords(categoryWords);

          const savedIndex = sessionStorage.getItem(`browseIndex_${category}`);
          const initialIndex = savedIndex !== null ? parseInt(savedIndex) : 0;
          setCurrentIndex(initialIndex);

          if (categoryWords.length > 0) {
            setCurrentWord(categoryWords[initialIndex]);
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
  }, [category]);

  useEffect(() => {
    if (words.length > 0 && currentIndex >= 0 && currentIndex < words.length) {
      const newWord = words[currentIndex];
      // 检查单词是否真的变化了（比较单词文本）
      if (!currentWord || currentWord.word !== newWord.word) {
        setCurrentWord(newWord);
      }
      sessionStorage.setItem(`browseIndex_${category}`, currentIndex);
    }
  }, [currentIndex, words, category]);

  // 根据当前单词更新收藏状态
  useEffect(() => {
    if (currentWord && category) {
      const favorite = storage.isFavoriteWord(currentWord.word, category);
      setIsFavorite(favorite);
    } else {
      setIsFavorite(false);
    }
  }, [currentWord, category]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event) => {
      // 如果用户正在输入框中输入，不处理快捷键
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            window.scrollTo(0, 0);
          } else {
            if (window.confirm('已经是第一个单词了，是否跳转到最后一个？')) {
              const lastIndex = words.length - 1;
              setCurrentIndex(lastIndex);
              window.scrollTo(0, 0);
            }
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentIndex < words.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            window.scrollTo(0, 0);
          } else {
            if (window.confirm('已经是最后一个单词了，是否从头开始？')) {
              setCurrentIndex(0);
              window.scrollTo(0, 0);
            }
          }
          break;
        case ' ':
          event.preventDefault();
          if (currentWord?.word) {
            start();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, words, currentWord, start]);

  const handleToggleFavorite = () => {
    if (!currentWord || !category) return;
    const favorite = storage.toggleFavoriteWord(currentWord.word, category);
    setIsFavorite(favorite);
  };

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      window.scrollTo(0, 0);
    } else {
      if (window.confirm('已经是最后一个单词了，是否从头开始？')) {
        setCurrentIndex(0);
        window.scrollTo(0, 0);
      }
    }
  };

  const prevWord = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      window.scrollTo(0, 0);
    } else {
      if (window.confirm('已经是第一个单词了，是否跳转到最后一个？')) {
        const lastIndex = words.length - 1;
        setCurrentIndex(lastIndex);
        window.scrollTo(0, 0);
      }
    }
  };

  if (!currentWord && words.length === 0) {
    return (
      <div className="container">
        <Header title={`${getCategoryName(category)} - 快速浏览`} showBack />
        <main className="detail-content">
          <div className="word-browse-status">加载中...</div>
        </main>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="container">
        <Header title={`${getCategoryName(category)} - 快速浏览`} showBack />
        <main className="detail-content">
          <div className="word-browse-status">暂无数据</div>
        </main>
      </div>
    );
  }

  const coreMeaning =
    currentWord.coreMeaning ||
    (currentWord.partOfSpeech
      ? `${currentWord.partOfSpeech} ${currentWord.coreMeaning}`
      : '暂无');
  const toeicSceneFocus =
    currentWord.toeicSceneFocus || currentWord.sceneFocus || '暂无';

  const keyCollocationsHtml = formatKeyCollocations(
    currentWord.keyCollocations || currentWord.usageCollocation
  );

  // 渲染TOEIC例句组件
  const renderExampleSentences = () => {
    if (
      currentWord.toeicExampleSentences &&
      Array.isArray(currentWord.toeicExampleSentences) &&
      currentWord.toeicExampleSentences.length > 0
    ) {
      return (
        <ol>
          {currentWord.toeicExampleSentences.map((sent, index) => (
            <li key={index}>
              <ExampleSentence sentence={sent} className="word-browse-example-sentence" />
            </li>
          ))}
        </ol>
      );
    } else {
      return <p className="word-browse-empty-text">暂无例句</p>;
    }
  };

  // 渲染易混淆词区分组件
  const renderConfusingWords = () => {
    if (
      currentWord.confusingWordsComparison &&
      Array.isArray(currentWord.confusingWordsComparison) &&
      currentWord.confusingWordsComparison.length > 0
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
            {currentWord.confusingWordsComparison.map((item, index) => (
              <tr key={index}>
                <td>
                  <ConfusingWordCell wordText={item.word} className="word-browse-clickable" />
                </td>
                <td>{item.coreDifference}</td>
                <td>{item.toeicSceneFocus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (currentWord.confusionDistinction) {
      // 如果存在 confusionDistinction 字符串，使用 dangerouslySetInnerHTML 作为后备
      return (
        <div dangerouslySetInnerHTML={{ __html: currentWord.confusionDistinction }} />
      );
    } else {
      return <div>暂无</div>;
    }
  };

  return (
    <div className="container">
      <Header
        title={`${getCategoryName(category)} - 快速浏览`}
        showBack
        showProgress
        currentIndex={currentIndex + 1}
        totalWords={words.length}
      />
      <main className="detail-content" ref={browseContentRef}>
        <div className="detail-card">
          <div className="detail-header">
            <div className="detail-header-main">
              <div
                className="word-title word-browse-clickable"
                onClick={() => {
                  start();
                }}
                title="点击播放发音"
              >
                {currentWord.word}
              </div>
              <button
                type="button"
                className={`favorite-btn ${
                  isFavorite ? 'favorite-btn-active' : ''
                }`}
                onClick={handleToggleFavorite}
                title={isFavorite ? '取消收藏该单词' : '收藏该单词'}
              >
                <span className="favorite-icon">{isFavorite ? '★' : '☆'}</span>
              </button>
            </div>
            <div className="phonetic">{currentWord.phonetic || '/ˈwɜːrd/'}</div>
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
              {currentWord.phrase ? (
                <PhraseCell phraseText={currentWord.phrase} />
              ) : (
                <p className="word-browse-empty-text">暂无</p>
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
                __html: currentWord.sceneAssociation || '暂无',
              }}
            />
          </div>

          <div className="detail-section">
            <h3 className="section-title">易混淆词区分</h3>
            <div className="section-content">{renderConfusingWords()}</div>
          </div>
        </div>
      </main>

      <footer className="browse-footer">
        <button className="btn btn-secondary" onClick={prevWord}>
          (←) 上一个
        </button>
        <button className="btn btn-primary" onClick={nextWord}>
          下一个 (→)
        </button>
      </footer>
    </div>
  );
}

export default WordBrowsePage;
