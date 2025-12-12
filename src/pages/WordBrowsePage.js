import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { wordData } from '../data';
import Header from '../components/Header';
import { getCategoryName, speakWord } from '../utils/app';

function WordBrowsePage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const browseContentRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const minSwipeDistance = 50;

  useEffect(() => {
    const categoryWords = wordData[category] || [];
    setWords(categoryWords);

    const savedIndex = sessionStorage.getItem(`browseIndex_${category}`);
    const initialIndex = savedIndex !== null ? parseInt(savedIndex) : 0;
    setCurrentIndex(initialIndex);

    if (categoryWords.length > 0) {
      setCurrentWord(categoryWords[initialIndex]);
    }
  }, [category]);

  useEffect(() => {
    if (words.length > 0 && currentIndex >= 0 && currentIndex < words.length) {
      setCurrentWord(words[currentIndex]);
      sessionStorage.setItem(`browseIndex_${category}`, currentIndex);
    }
  }, [currentIndex, words, category]);

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
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
      setCurrentIndex(currentIndex - 1);
      window.scrollTo(0, 0);
    } else {
      if (window.confirm('已经是第一个单词了，是否跳转到最后一个？')) {
        setCurrentIndex(words.length - 1);
        window.scrollTo(0, 0);
      }
    }
  };

  const playDetailPronunciation = () => {
    if (currentWord) {
      speakWord(currentWord.word);
    }
  };

  if (!currentWord) {
    return <div>加载中...</div>;
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
            <div className="word-title" onClick={playDetailPronunciation}>
              {currentWord.word}
            </div>
            <div className="phonetic" onClick={playDetailPronunciation}>
              {currentWord.phonetic || '/ˈwɜːrd/'}
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
          上一个
        </button>
        <button className="btn btn-primary" onClick={nextWord}>
          下一个
        </button>
      </footer>
    </div>
  );
}

export default WordBrowsePage;
