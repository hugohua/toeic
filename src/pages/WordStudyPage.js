import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { wordData } from '../data';
import Header from '../components/Header';
import { getCategoryName } from '../utils/app';
import { useGlobalSpeech } from '../utils/speechContext';
import {
  startStudy,
  saveWordStatus,
} from '../utils/storage';
import { scheduleReview } from '../utils/ebbinghaus';

function WordStudyPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { speak } = useGlobalSpeech();
  const lastPlayedWordRef = useRef(null); // 跟踪上一次播放的单词

  // 初始化学习
  useEffect(() => {
    const categoryWords = wordData[category] || [];
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
  }, [category, searchParams]);

  useEffect(() => {
    startStudy();
  }, []);

  // 自动播放单词发音（只在单词变化时播放一次）
  useEffect(() => {
    if (currentWord && currentWord.word && !isLoading && currentWord.word !== lastPlayedWordRef.current) {
      lastPlayedWordRef.current = currentWord.word; // 记录当前单词
      // 延迟一点播放，确保页面已经渲染
      const timer = setTimeout(() => {
        speak(currentWord.word);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentWord, isLoading, speak]);

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
              lastPlayedWordRef.current = null; // 重置播放记录
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
            lastPlayedWordRef.current = null; // 重置播放记录
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
        lastPlayedWordRef.current = null; // 重置播放记录，确保新单词能播放
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
            lastPlayedWordRef.current = null; // 重置播放记录
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
  }, [searchParams, words, category, navigate, isLoading, currentWord, currentIndex]);

  const viewWordDetail = () => {
    if (!currentWord) return;

    // 查看当前单词详情，添加from=study参数标识从学习页面跳转
    navigate(`/detail/${category}/${currentIndex}?from=study`);
  };

  const playPronunciation = () => {
    if (currentWord) {
      speak(currentWord.word);
    }
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
            <div className="word-text" onClick={playPronunciation}>
              {currentWord.word}
            </div>
            <div className="phonetic" onClick={playPronunciation}>
              {currentWord.phonetic || '/ˈwɜːrd/'}
            </div>
            <div className="play-hint">点击单词或音标播放发音</div>
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
