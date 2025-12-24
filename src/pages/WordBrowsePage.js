import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpeech } from 'react-text-to-speech';
import { getWordsByCategory } from '../utils/api';
import Header from '../components/Header';
import PhraseCell from '../components/PhraseCell';
import { getCategoryName } from '../utils/app';
import * as storage from '../utils/storage';

function WordBrowsePage() {
  const { category } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const browseContentRef = useRef(null);

  // 使用 useSpeech，传入当前单词作为 text
  const { start } = useSpeech({
    text: currentWord?.word || '',
    pitch: 1,
    rate: 1,
    volume: 1,
  });

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
          <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>
        </main>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="container">
        <Header title={`${getCategoryName(category)} - 快速浏览`} showBack />
        <main className="detail-content">
          <div style={{ padding: '20px', textAlign: 'center' }}>暂无数据</div>
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

  let keyCollocationsHtml = '';
  if (
    currentWord.keyCollocations &&
    Array.isArray(currentWord.keyCollocations)
  ) {
    keyCollocationsHtml =
      '<ul>' +
      currentWord.keyCollocations.map((coll) => `<li>${coll}</li>`).join('') +
      '</ul>';
  } else if (currentWord.usageCollocation) {
    keyCollocationsHtml = currentWord.usageCollocation;
  } else {
    keyCollocationsHtml = '暂无';
  }

  let exampleSentencesHtml = '';
  if (
    currentWord.toeicExampleSentences &&
    Array.isArray(currentWord.toeicExampleSentences) &&
    currentWord.toeicExampleSentences.length > 0
  ) {
    exampleSentencesHtml =
      '<ol>' +
      currentWord.toeicExampleSentences
        .map((sent) => `<li>${sent}</li>`)
        .join('') +
      '</ol>';
  } else {
    exampleSentencesHtml = '<p style="color: #999;">暂无例句</p>';
  }

  let confusingWordsHtml = '';
  if (
    currentWord.confusingWordsComparison &&
    Array.isArray(currentWord.confusingWordsComparison)
  ) {
    confusingWordsHtml =
      '<table class="confusing-words-table"><thead><tr><th>单词</th><th>核心区别</th><th>TOEIC场景重点</th></tr></thead><tbody>';
    currentWord.confusingWordsComparison.forEach((item) => {
      confusingWordsHtml += `<tr><td><strong>${item.word}</strong></td><td>${item.coreDifference}</td><td>${item.toeicSceneFocus}</td></tr>`;
    });
    confusingWordsHtml += '</tbody></table>';
  } else if (currentWord.confusionDistinction) {
    confusingWordsHtml = currentWord.confusionDistinction;
  } else {
    confusingWordsHtml = '暂无';
  }

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
                className="word-title"
                onClick={() => {
                  start();
                }}
                style={{ cursor: 'pointer' }}
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
                <p style={{ color: '#999' }}>暂无</p>
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
            <div
              className="section-content"
              dangerouslySetInnerHTML={{ __html: exampleSentencesHtml }}
            />
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
            <div
              className="section-content"
              dangerouslySetInnerHTML={{ __html: confusingWordsHtml }}
            />
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
