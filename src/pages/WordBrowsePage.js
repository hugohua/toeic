import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSpeechConfig } from '../hooks/useSpeechConfig';
import { getWordsByCategory } from '../services/api';
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
import './WordBrowsePage.css';

function WordBrowsePage() {
  const { category } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteWords, setFavoriteWords] = useState(new Set()); // 缓存收藏列表
  const browseContentRef = useRef(null);

  // 使用 useSpeech，传入当前单词作为 text
  const { start, stop, isPlaying, isLoading } = useSpeechConfig(currentWord?.word || '');

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

  // 根据当前单词更新收藏状态（本地检查）
  useEffect(() => {
    if (currentWord) {
      setIsFavorite(favoriteWords.has(currentWord.word));
    } else {
      setIsFavorite(false);
    }
  }, [currentWord, favoriteWords]);

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

  const handleToggleFavorite = async () => {
    if (!currentWord || !category) return;
    const favorite = await toggleWordInList(WORD_LIST_TYPES.FAVORITE, currentWord.word, category);

    // 同步更新本地缓存
    setFavoriteWords(prev => {
      const newSet = new Set(prev);
      if (favorite) {
        newSet.add(currentWord.word);
      } else {
        newSet.delete(currentWord.word);
      }
      return newSet;
    });

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
        <Loading text="加载中..." />
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

  return (
    <div className="container">
      <Header
        title={`${getCategoryName(category)} - 快速浏览`}
        showBack
        showProgress
        currentIndex={currentIndex + 1}
        totalWords={words.length}
      />
      <WordDetailContent
        word={currentWord}
        mode="page"
        cssPrefix="word-browse"
        onPlaySound={handlePlaySound}
        isPlayingSound={isPlaying}
        isLoadingSound={isLoading}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        progressCurrent={currentIndex + 1}
        progressTotal={words.length}
        contentRef={browseContentRef}
      />

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
