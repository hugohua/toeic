import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSpeech } from 'react-text-to-speech';
import { getWordsByCategory } from '../utils/api';
import Header from '../components/Header';
import PhraseCell from '../components/PhraseCell';
import { getCategoryName } from '../utils/app';
import { startStudy, saveWordStatus } from '../utils/storage';
import { scheduleReview } from '../utils/ebbinghaus';
import '../index.css';
import './WordStudyPage.css';

function WordStudyPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 使用 useSpeech，传入当前单词作为 text
  const { start } = useSpeech({
    text: currentWord?.word || '',
    pitch: 1,
    rate: 1,
    volume: 1,
  });

  // 初始化学习
  useEffect(() => {
    let isMounted = true;

    async function loadWords() {
      try {
        const categoryWords = await getWordsByCategory(category);

        if (!isMounted) return;

        if (categoryWords.length === 0) {
          setIsLoading(false);
          return;
        }

        setWords(categoryWords);

        // 恢复保存的进度
        const savedIndex = localStorage.getItem(`studyIndex_${category}`);
        const indexParam = searchParams.get('index');

        let initialIndex = 0;
        if (indexParam !== null) {
          initialIndex = parseInt(indexParam);
          if (initialIndex >= 0 && initialIndex < categoryWords.length) {
            setCurrentIndex(initialIndex);
            setCurrentWord(categoryWords[initialIndex]);
          } else {
            setCurrentIndex(0);
            setCurrentWord(categoryWords[0]);
          }
        } else if (savedIndex !== null) {
          initialIndex = parseInt(savedIndex);
          if (initialIndex >= 0 && initialIndex < categoryWords.length) {
            setCurrentIndex(initialIndex);
            setCurrentWord(categoryWords[initialIndex]);
          } else {
            setCurrentIndex(0);
            setCurrentWord(categoryWords[0]);
          }
        } else {
          setCurrentIndex(0);
          setCurrentWord(categoryWords[0]);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('加载单词列表失败:', error);
        if (isMounted) {
          setIsLoading(false);
          setWords([]);
        }
      }
    }

    loadWords();

    return () => {
      isMounted = false;
    };
  }, [category, searchParams]);

  useEffect(() => {
    startStudy();
  }, []);

  // 保存当前进度
  const saveProgress = (index) => {
    localStorage.setItem(`studyIndex_${category}`, index.toString());
  };

  // 监听页面可见性变化，当从详情页返回时自动继续下一个单词
  useEffect(() => {
    if (words.length === 0 || !currentWord) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见时，延迟一下再检查，确保localStorage已更新
        setTimeout(() => {
          const wordKey = `${category}-${currentWord.word}`;
          const statusData = localStorage.getItem(`word_${wordKey}`);

          if (statusData) {
            // 当前单词已学习，继续下一个
            const nextIndex = currentIndex + 1;

            if (nextIndex < words.length) {
              // 还有下一个单词
              setCurrentIndex(nextIndex);
              setCurrentWord(words[nextIndex]);
              saveProgress(nextIndex);
            } else {
              // 已经是最后一个单词
              alert('恭喜！该分类的所有单词都已学习完成！');
              navigate(`/list/${category}`);
            }
          }
        }, 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 也监听focus事件作为备用
    const handleFocus = () => {
      setTimeout(() => {
        const wordKey = `${category}-${currentWord.word}`;
        const statusData = localStorage.getItem(`word_${wordKey}`);

        if (statusData) {
          // 当前单词已学习，继续下一个
          const nextIndex = currentIndex + 1;

          if (nextIndex < words.length) {
            // 还有下一个单词
            setCurrentIndex(nextIndex);
            setCurrentWord(words[nextIndex]);
            saveProgress(nextIndex);
          } else {
            // 已经是最后一个单词
            alert('恭喜！该分类的所有单词都已学习完成！');
            navigate(`/list/${category}`);
          }
        }
      }, 300);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [words, currentWord, category, navigate, currentIndex]);

  const showWordDetail = (status) => {
    if (!currentWord) return;

    const wordKey = `${category}-${currentWord.word}`;
    const now = Date.now();

    // 保存学习记录
    saveWordStatus(wordKey, status, now);
    scheduleReview(wordKey, status, now);

    // 跳转到单词详情页，添加from=study参数标识从学习页面跳转
    navigate(`/detail/${category}/${currentIndex}?from=study`);
  };

  // 从详情页返回后，继续下一个单词
  useEffect(() => {
    if (words.length === 0 || !currentWord || isLoading) return;

    const indexParam = searchParams.get('index');

    // 如果有 index 参数，根据参数定位单词
    if (indexParam !== null) {
      const targetIndex = parseInt(indexParam);
      if (targetIndex >= 0 && targetIndex < words.length) {
        setCurrentIndex(targetIndex);
        setCurrentWord(words[targetIndex]);
        saveProgress(targetIndex);
      }
    }

    // 如果没有 index 参数，检查当前单词是否已学习，如果是则前进到下一个
    const checkAndContinueTimer = setTimeout(() => {
      if (indexParam === null) {
        // 没有 index 参数，说明是从详情页直接返回的
        const wordKey = `${category}-${currentWord.word}`;
        const statusData = localStorage.getItem(`word_${wordKey}`);

        if (statusData) {
          // 当前单词已学习，继续下一个
          const nextIndex = currentIndex + 1;

          if (nextIndex < words.length) {
            // 还有下一个单词
            setCurrentIndex(nextIndex);
            setCurrentWord(words[nextIndex]);
            saveProgress(nextIndex);
          } else {
            // 已经是最后一个单词
            alert('恭喜！该分类的所有单词都已学习完成！');
            navigate(`/list/${category}`);
          }
        }
      }
    }, 200); // 延迟200ms确保页面已完全加载

    return () => {
      clearTimeout(checkAndContinueTimer);
    };
  }, [
    searchParams,
    words,
    category,
    navigate,
    isLoading,
    currentWord,
    currentIndex,
  ]);

  const viewWordDetail = () => {
    if (!currentWord) return;

    // 查看当前单词详情，添加from=study参数标识从学习页面跳转
    navigate(`/detail/${category}/${currentIndex}?from=study`);
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (!currentWord || words.length === 0) {
    return (
      <div className="container">
        <Header title={getCategoryName(category)} showBack />
        <main className="study-content">
          <div className="empty-message">暂无单词可学习</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header
        title={getCategoryName(category)}
        showBack
        showProgress
        currentIndex={currentIndex + 1}
        totalWords={words.length}
      />
      <main className="study-content">
        <div className="word-display">
          <div className="word-card">
            <div
              className="word-text word-study-clickable"
              onClick={() => {
                start();
              }}
              title="点击播放发音"
            >
              {currentWord.word}
            </div>
            <div className="phonetic">{currentWord.phonetic || '/ˈwɜːrd/'}</div>
            {currentWord.phrase && (
              <div className="word-phrase word-study-phrase">
                <PhraseCell phraseText={currentWord.phrase} />
              </div>
            )}
            <button
              className="btn-view-detail"
              onClick={viewWordDetail}
              title="查看详情"
            >
              查看详情
            </button>
          </div>
        </div>
      </main>
      <footer className="study-footer">
        <button
          className="btn btn-known"
          onClick={() => showWordDetail('known')}
        >
          认识
        </button>
        <button
          className="btn btn-unknown"
          onClick={() => showWordDetail('unknown')}
        >
          不认识
        </button>
        <button
          className="btn btn-fuzzy"
          onClick={() => showWordDetail('fuzzy')}
        >
          模糊
        </button>
      </footer>
    </div>
  );
}

export default WordStudyPage;
