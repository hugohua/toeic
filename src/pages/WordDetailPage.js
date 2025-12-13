import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSpeech } from 'react-text-to-speech';
import { wordData } from '../data';
import Header from '../components/Header';
import { getCategoryName } from '../utils/app';
import * as storage from '../utils/storage';

// 易混淆单词单元格组件，支持发音功能
function ConfusingWordCell({ wordText }) {
  const { start } = useSpeech({
    text: wordText || '',
    pitch: 1,
    rate: 1,
    volume: 1
  });

  return (
    <strong
      onClick={() => {
        start();
      }}
      style={{ cursor: 'pointer' }}
      title="点击播放发音"
    >
      {wordText}
    </strong>
  );
}

// 例句组件，支持提取英文部分并发音
function ExampleSentence({ sentence }) {
  // 提取英文句子（括号前的部分）
  const extractEnglishText = (text) => {
    if (!text) return { english: '', remaining: '' };
    // 查找第一个中文括号（或英文括号）之前的所有内容作为英文部分
    const match = text.match(/^([^(（]+)([（(].*)?$/);
    if (match) {
      return {
        english: match[1].trim(),
        remaining: match[2] || ''
      };
    }
    return { english: text, remaining: '' };
  };

  const { english: englishText, remaining: remainingText } = extractEnglishText(sentence);
  const { start } = useSpeech({
    text: englishText || '',
    pitch: 1,
    rate: 1,
    volume: 1
  });

  return (
    <span>
      <span
        onClick={() => {
          start();
        }}
        style={{ cursor: 'pointer' }}
        title="点击播放发音"
      >
        {englishText}
      </span>
      {remainingText}
    </span>
  );
}

function WordDetailPage() {
  const { category, index } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [word, setWord] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState([]);
  const fromStudy = searchParams.get('from') === 'study'; // 检测是否从学习页面跳转
  
  // 使用 useSpeech，传入当前单词作为 text
  const { start } = useSpeech({ 
    text: word?.word || '',
    pitch: 1,
    rate: 1,
    volume: 1
  });

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
      } else {
        if (window.confirm('已经是最后一个单词了，是否从头开始？')) {
          navigate(`/detail/${category}/0`);
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
              <ExampleSentence sentence={sent} />
            </li>
          ))}
        </ol>
      );
    } else {
      return <p style={{ color: '#999' }}>暂无例句</p>;
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
                  <ConfusingWordCell wordText={item.word} />
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
        currentIndex={currentIndex + 1}
        totalWords={words.length}
      />
      <main className="detail-content">
        <div className="detail-card">
          <div className="detail-header">
            <div 
              className="word-title"
              onClick={() => {
                start();
              }}
              style={{ cursor: 'pointer' }}
              title="点击播放发音"
            >
              {word.word}
            </div>
            <div className="phonetic">
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
            <div className="section-content">
              {renderExampleSentences()}
            </div>
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
            <div className="section-content">
              {renderConfusingWords()}
            </div>
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
