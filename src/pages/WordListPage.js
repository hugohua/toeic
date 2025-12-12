import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { wordData } from '../data';
import Header from '../components/Header';
import { getCategoryName } from '../utils/app';
import '../index.css';
import './WordListPage.css';

function WordListPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [words, setWords] = useState([]);

  useEffect(() => {
    const categoryWords = wordData[category] || [];
    setWords(categoryWords);
  }, [category]);

  const handleRowClick = (index) => {
    navigate(`/detail/${category}/${index}`);
  };

  const handleStartStudy = () => {
    navigate(`/study/${category}`);
  };

  const getPartOfSpeech = (word) => {
    if (word.partOfSpeech) {
      // 提取简短的词性，如 "n. 名词" -> "n."
      const match = word.partOfSpeech.match(/^([nvadjadv]\.?)/i);
      return match ? match[1] : word.partOfSpeech.split(' ')[0];
    }
    // 如果没有partOfSpeech，尝试从coreMeaning中提取
    const meaning = word.coreMeaning || '';
    const match = meaning.match(/^([nvadjadv]\.?\s*[^；，。]+)/);
    return match ? match[1].trim() : '-';
  };

  const getShortMeaning = (word) => {
    let meaning = word.coreMeaning || '';

    // 如果有partOfSpeech，从coreMeaning中移除词性部分
    if (word.partOfSpeech) {
      // 移除词性前缀（如 "n. 名词" 或类似格式）
      meaning = meaning.replace(/^[nvadjadv]\.?\s*[^；，。]+[；，。]?\s*/, '');
    }

    // 如果还有分号或逗号，取第一部分
    if (meaning.includes('；') || meaning.includes('，')) {
      meaning = meaning.split(/[；，]/)[0];
    }

    // 移除括号中的详细说明（保留核心意思）
    meaning = meaning.replace(/（[^）]*）/g, '');
    meaning = meaning.replace(/\([^)]*\)/g, '');

    // 限制长度
    if (meaning.length > 60) {
      meaning = meaning.substring(0, 60) + '...';
    }

    return meaning.trim() || '-';
  };

  if (words.length === 0) {
    return (
      <div className="container">
        <Header title={`${getCategoryName(category)} - 单词列表`} showBack />
        <main className="word-list-content">
          <div className="empty-message">该分类暂无单词</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title={`${getCategoryName(category)} - 单词列表`} showBack />
      <main className="word-list-content">
        <div className="word-list-table-container">
          <table className="word-list-table">
            <thead>
              <tr>
                <th className="col-word">单词</th>
                <th className="col-pos">词性</th>
                <th className="col-meaning">解释</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, index) => (
                <tr
                  key={`${word.word}-${index}`}
                  className="word-list-row"
                  onClick={() => handleRowClick(index)}
                >
                  <td className="col-word">
                    <span className="word-list-text">{word.word}</span>
                  </td>
                  <td className="col-pos">
                    <span className="pos-text">{getPartOfSpeech(word)}</span>
                  </td>
                  <td className="col-meaning">
                    <span className="meaning-text">
                      {getShortMeaning(word)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="word-list-footer">
          <div className="word-count">共 {words.length} 个单词</div>
          <button
            className="btn btn-primary"
            onClick={handleStartStudy}
            style={{ marginTop: '10px' }}
          >
            开始背单词
          </button>
        </div>
      </main>
    </div>
  );
}

export default WordListPage;
