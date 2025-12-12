import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { wordData } from '../data';
import Header from '../components/Header';
import { getCategoryName } from '../utils/app';
import { useGlobalSpeech } from '../utils/speechContext';
import {
  startStudy,
  saveWordStatus,
  getStudyGroupProgress,
  saveStudyGroupProgress,
  clearStudyGroupProgress,
  getNextStudyGroup,
} from '../utils/storage';
import { scheduleReview } from '../utils/ebbinghaus';

function WordStudyPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0); // 当前组内的索引
  const [studyGroup, setStudyGroup] = useState([]); // 当前学习组的单词列表
  const [currentWord, setCurrentWord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { speak } = useGlobalSpeech();

  // 初始化学习组
  useEffect(() => {
    const categoryWords = wordData[category] || [];
    if (categoryWords.length === 0) {
      setIsLoading(false);
      return;
    }

    // 检查是否有未完成的学习组
    const savedProgress = getStudyGroupProgress(category);

    if (
      savedProgress &&
      savedProgress.groupWords &&
      savedProgress.groupWords.length > 0
    ) {
      // 恢复未完成的学习组
      setStudyGroup(savedProgress.groupWords);
      const indexParam = searchParams.get('index');
      if (indexParam !== null) {
        const targetIndex = parseInt(indexParam);
        if (targetIndex >= 0 && targetIndex < savedProgress.groupWords.length) {
          setCurrentGroupIndex(targetIndex);
          setCurrentWord(savedProgress.groupWords[targetIndex].word);
          setIsLoading(false);
          return;
        }
      }
      // 使用保存的进度
      const savedIndex = savedProgress.currentIndex || 0;
      setCurrentGroupIndex(savedIndex);
      setCurrentWord(savedProgress.groupWords[savedIndex].word);
    } else {
      // 创建新的学习组
      const completedWordKeys = new Set();
      // 获取所有已完成的单词（通过检查localStorage中的单词状态）
      categoryWords.forEach((word) => {
        const wordKey = `${category}-${word.word}`;
        const statusData = localStorage.getItem(`word_${wordKey}`);
        if (statusData) {
          completedWordKeys.add(wordKey);
        }
      });

      const newGroup = getNextStudyGroup(
        category,
        categoryWords,
        completedWordKeys
      );

      if (!newGroup || newGroup.length === 0) {
        // 所有单词都已完成
        alert('恭喜！该分类的所有单词都已学习完成！');
        navigate(`/list/${category}`);
        setIsLoading(false);
        return;
      }

      setStudyGroup(newGroup);
      setCurrentGroupIndex(0);
      setCurrentWord(newGroup[0].word);

      // 保存新的学习组进度
      saveStudyGroupProgress(category, {
        groupWords: newGroup,
        currentIndex: 0,
        createdAt: Date.now(),
      });
    }

    setIsLoading(false);
  }, [category, searchParams, navigate]);

  useEffect(() => {
    startStudy();
  }, []);

  // 保存当前进度
  const saveProgress = (index) => {
    if (studyGroup.length > 0) {
      saveStudyGroupProgress(category, {
        groupWords: studyGroup,
        currentIndex: index,
        createdAt: Date.now(),
      });
    }
  };

  // 检查是否完成当前组
  const checkGroupCompletion = () => {
    // 检查当前组的所有单词是否都已学习
    const allCompleted = studyGroup.every((item) => {
      const wordKey = `${category}-${item.word.word}`;
      const statusData = localStorage.getItem(`word_${wordKey}`);
      return statusData !== null;
    });

    if (allCompleted) {
      // 清除当前组进度
      clearStudyGroupProgress(category);
      // 提示完成
      alert('恭喜！本组20个单词已全部学习完成！');
      // 返回列表页
      navigate(`/list/${category}`);
      return true;
    }
    return false;
  };

  // 监听页面可见性变化，当从详情页返回时自动继续下一个单词
  useEffect(() => {
    if (studyGroup.length === 0 || !currentWord) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见时，延迟一下再检查，确保localStorage已更新
        setTimeout(() => {
          const wordKey = `${category}-${currentWord.word}`;
          const statusData = localStorage.getItem(`word_${wordKey}`);

          if (statusData) {
            // 当前单词已学习，继续下一个
            setCurrentGroupIndex((prevIndex) => {
              const nextIndex = prevIndex + 1;
              if (nextIndex < studyGroup.length) {
                setCurrentWord(studyGroup[nextIndex].word);
                saveProgress(nextIndex);
                return nextIndex;
              } else {
                // 已到组内最后一个单词，检查是否完成
                checkGroupCompletion();
                return prevIndex;
              }
            });
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
          setCurrentGroupIndex((prevIndex) => {
            const nextIndex = prevIndex + 1;
            if (nextIndex < studyGroup.length) {
              setCurrentWord(studyGroup[nextIndex].word);
              saveProgress(nextIndex);
              return nextIndex;
            } else {
              // 已到组内最后一个单词，检查是否完成
              checkGroupCompletion();
              return prevIndex;
            }
          });
        }
      }, 300);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [studyGroup, currentWord, category]);

  const showWordDetail = (status) => {
    if (!currentWord) return;

    const wordKey = `${category}-${currentWord.word}`;
    const now = Date.now();

    // 保存学习记录
    saveWordStatus(wordKey, status, now);
    scheduleReview(wordKey, status, now);

    // 获取当前单词在原数组中的索引
    const currentItem = studyGroup[currentGroupIndex];
    const originalIndex = currentItem ? currentItem.originalIndex : 0;

    // 跳转到单词详情页，添加from=study参数标识从学习页面跳转
    navigate(`/detail/${category}/${originalIndex}?from=study`);
  };

  // 从详情页返回后，继续下一个单词
  useEffect(() => {
    const indexParam = searchParams.get('index');
    if (indexParam !== null && studyGroup.length > 0) {
      const targetOriginalIndex = parseInt(indexParam);
      // 在当前组中查找对应的单词
      const groupItemIndex = studyGroup.findIndex(
        (item) => item.originalIndex === targetOriginalIndex
      );
      if (groupItemIndex >= 0) {
        setCurrentGroupIndex(groupItemIndex);
        setCurrentWord(studyGroup[groupItemIndex].word);
        saveProgress(groupItemIndex);

        // 检查是否完成
        setTimeout(() => {
          checkGroupCompletion();
        }, 100);
      }
    }
  }, [searchParams, studyGroup, category, navigate]);

  const viewWordDetail = () => {
    if (!currentWord) return;

    // 获取当前单词在原数组中的索引
    const currentItem = studyGroup[currentGroupIndex];
    const originalIndex = currentItem ? currentItem.originalIndex : 0;

    // 查看当前单词详情，添加from=study参数标识从学习页面跳转
    navigate(`/detail/${category}/${originalIndex}?from=study`);
  };

  const playPronunciation = () => {
    if (currentWord) {
      speak(currentWord.word);
    }
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (!currentWord || studyGroup.length === 0) {
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
        currentIndex={currentGroupIndex + 1}
        totalWords={studyGroup.length}
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
