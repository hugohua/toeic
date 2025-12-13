import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { wordData } from '../data';
import Header from '../components/Header';
import { getCategoryName } from '../utils/app';
import { useGlobalSpeech } from '../utils/speechContext';
import * as storage from '../utils/storage';

function WordDetailPage() {
  const { category, index } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [word, setWord] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState([]);
  const fromStudy = searchParams.get('from') === 'study'; // 检测是否从学习页面跳转
  const { speak } = useGlobalSpeech();

  useEffect(() => {
    const categoryWords = wordData[category] || [];
    setWords(categoryWords);
    const wordIndex = parseInt(index);
    setCurrentIndex(wordIndex);
    if (categoryWords[wordIndex]) {
      setWord(categoryWords[wordIndex]);
      // 滚动到顶部
      window.scrollTo(0, 0);
    }
  }, [category, index]);

  const goToNextWord = () => {
    const nextIndex = currentIndex + 1;
    if (fromStudy) {
      // 如果是从学习页面跳转来的，返回到学习页面
      // 让学习页面自己处理下一个单词的逻辑（它会自动检查是否完成并生成新组）
      navigate(`/study/${category}`);
    } else {
      // 否则在详情页之间切换
      if (nextIndex < words.length) {
        navigate(`/detail/${category}/${nextIndex}`);
        // 用户点击按钮，立即播放新单词
        const nextWordObj = words[nextIndex];
        if (nextWordObj && nextWordObj.word) {
          speak(nextWordObj.word);
        }
      } else {
        if (window.confirm('已经是最后一个单词了，是否从头开始？')) {
          navigate(`/detail/${category}/0`);
          const firstWordObj = words[0];
          if (firstWordObj && firstWordObj.word) {
            speak(firstWordObj.word);
          }
        }
      }
    }
  };

  const goToPrevWord = () => {
    const prevIndex = currentIndex - 1;
    if (fromStudy) {
      // 如果是从学习页面跳转来的，返回到学习页面
      // 让学习页面自己处理上一个单词的逻辑
      navigate(`/study/${category}`);
    } else {
      // 否则在详情页之间切换
      if (prevIndex >= 0) {
        navigate(`/detail/${category}/${prevIndex}`);
        // 用户点击按钮，立即播放新单词
        const prevWordObj = words[prevIndex];
        if (prevWordObj && prevWordObj.word) {
          speak(prevWordObj.word);
        }
      } else {
        if (window.confirm('已经是第一个单词了，是否跳转到最后一个？')) {
          const lastIndex = words.length - 1;
          navigate(`/detail/${category}/${lastIndex}`);
          const lastWordObj = words[lastIndex];
          if (lastWordObj && lastWordObj.word) {
            speak(lastWordObj.word);
          }
        }
      }
    }
  };

  const playDetailPronunciation = () => {
    if (word) {
      speak(word.word);
    }
  };

  if (!word) {
    return <div>加载中...</div>;
  }

  const coreMeaning =
    word.coreMeaning ||
    (word.partOfSpeech ? `${word.partOfSpeech} ${word.coreMeaning}` : '暂无');
  const toeicSceneFocus = word.toeicSceneFocus || word.sceneFocus || '暂无';

  let keyCollocationsHtml = '';
  if (word.keyCollocations && Array.isArray(word.keyCollocations)) {
    keyCollocationsHtml =
      '<ul>' +
      word.keyCollocations.map((coll) => `<li>${coll}</li>`).join('') +
      '</ul>';
  } else if (word.usageCollocation) {
    keyCollocationsHtml = word.usageCollocation;
  } else {
    keyCollocationsHtml = '暂无';
  }

  let exampleSentencesHtml = '';
  if (
    word.toeicExampleSentences &&
    Array.isArray(word.toeicExampleSentences) &&
    word.toeicExampleSentences.length > 0
  ) {
    exampleSentencesHtml =
      '<ol>' +
      word.toeicExampleSentences.map((sent) => `<li>${sent}</li>`).join('') +
      '</ol>';
  } else {
    exampleSentencesHtml = '<p style="color: #999;">暂无例句</p>';
  }

  let confusingWordsHtml = '';
  if (
    word.confusingWordsComparison &&
    Array.isArray(word.confusingWordsComparison)
  ) {
    confusingWordsHtml =
      '<table class="confusing-words-table"><thead><tr><th>单词</th><th>核心区别</th><th>TOEIC场景重点</th></tr></thead><tbody>';
    word.confusingWordsComparison.forEach((item) => {
      confusingWordsHtml += `<tr><td><strong>${item.word}</strong></td><td>${item.coreDifference}</td><td>${item.toeicSceneFocus}</td></tr>`;
    });
    confusingWordsHtml += '</tbody></table>';
  } else if (word.confusionDistinction) {
    confusingWordsHtml = word.confusionDistinction;
  } else {
    confusingWordsHtml = '暂无';
  }

  return (
    <div className="container">
      <Header
        title={fromStudy ? getCategoryName(category) : '单词详情'}
        showBack
        showProgress={fromStudy}
        currentIndex={currentIndex + 1}
        totalWords={words.length}
      />
      <main className="detail-content">
        <div className="detail-card">
          <div className="detail-header">
            <div className="word-title" onClick={playDetailPronunciation}>
              {word.word}
            </div>
            <div className="phonetic" onClick={playDetailPronunciation}>
              {word.phonetic || '/ˈwɜːrd/'}
            </div>
            <div className="word-progress">
              {currentIndex + 1} / {words.length}
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
                __html: word.sceneAssociation || '暂无',
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

      <footer className="detail-footer">
        <button
          className="btn btn-secondary"
          onClick={goToPrevWord}
          disabled={currentIndex === 0}
        >
          上一个
        </button>
        <button
          className="btn btn-primary"
          onClick={goToNextWord}
          disabled={currentIndex === words.length - 1}
        >
          下一个
        </button>
      </footer>
    </div>
  );
}

export default WordDetailPage;
