import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getFavoriteWords } from '../utils/storage';
import { wordData } from '../data';
import { getCategoryName } from '../utils/app';
import '../index.css';
import './WordListPage.css';

const categoryIconMap = {
  recruitment: '👔',
  business_communication: '💼',
  business_transaction: '🤝',
  marketing: '📢',
  logistics: '🚚',
  finance: '💰',
  office_administration: '📋',
  product_tech: '💻',
  legal: '⚖️',
  travel: '✈️',
  education: '📚',
  healthcare: '🏥',
  construction: '🏗️',
  food: '🍽️',
  arts: '🎨',
  nature: '🌳',
  society: '🏛️',
  psychology: '🧠',
  digital: '🔢',
  time: '📅',
};

function FavoriteWordListPage() {
  const navigate = useNavigate();

  const favoriteWords = useMemo(() => {
    const list = getFavoriteWords();
    // 过滤掉在当前词库中已经不存在的单词
    return list
      .map((item) => {
        const categoryWords = wordData[item.category];
        if (!categoryWords || !Array.isArray(categoryWords)) return null;
        const index = categoryWords.findIndex((w) => w.word === item.word);
        if (index === -1) return null;
        const word = categoryWords[index];
        return {
          ...item,
          index,
          data: word,
        };
      })
      .filter(Boolean);
  }, []);

  const handleRowClick = (clickedIndex) => {
    if (!favoriteWords || favoriteWords.length === 0) return;

    const favoriteListState = favoriteWords.map((item) => ({
      word: item.word,
      category: item.category,
      index: item.index,
    }));

    const item = favoriteWords[clickedIndex];
    navigate(`/detail/${item.category}/${item.index}`, {
      state: {
        from: 'favorites',
        favoriteList: favoriteListState,
        favoriteIndex: clickedIndex,
      },
    });
  };

  const getPartOfSpeech = (word) => {
    if (word.partOfSpeech) {
      const match = word.partOfSpeech.match(/^([nvadjadv]\.?)/i);
      return match ? match[1] : word.partOfSpeech.split(' ')[0];
    }
    const meaning = word.coreMeaning || '';
    const match = meaning.match(/^([nvadjadv]\.?\s*[^；，。]+)/);
    return match ? match[1].trim() : '-';
  };

  const getShortMeaning = (word) => {
    let meaning = word.coreMeaning || '';

    if (word.partOfSpeech) {
      meaning = meaning.replace(/^[nvadjadv]\.?\s*[^；，。]+[；，。]?\s*/, '');
    }

    if (meaning.includes('；') || meaning.includes('，')) {
      meaning = meaning.split(/[；，]/)[0];
    }

    meaning = meaning.replace(/（[^）]*）/g, '');
    meaning = meaning.replace(/\([^)]*\)/g, '');

    if (meaning.length > 60) {
      meaning = meaning.substring(0, 60) + '...';
    }

    return meaning.trim() || '-';
  };

  if (favoriteWords.length === 0) {
    return (
      <div className="container">
        <Header title="收藏单词" showBack />
        <main className="word-list-content">
          <div className="empty-message">还没有收藏任何单词哦～</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="收藏单词" showBack />
      <main className="word-list-content">
        <div className="word-list-table-container">
          <table className="word-list-table">
            <thead>
              <tr>
                <th className="col-word">单词</th>
                <th className="col-pos">词性</th>
                <th className="col-meaning">解释</th>
                <th className="col-pos">场景</th>
              </tr>
            </thead>
            <tbody>
              {favoriteWords.map((item, index) => (
                <tr
                  key={`${item.category}-${item.word}-${index}`}
                  className="word-list-row"
                  onClick={() => handleRowClick(index)}
                >
                  <td className="col-word">
                    <span className="word-list-text">{item.word}</span>
                  </td>
                  <td className="col-pos">
                    <span className="pos-text">
                      {getPartOfSpeech(item.data || {})}
                    </span>
                  </td>
                  <td className="col-meaning">
                    <span className="meaning-text">
                      {getShortMeaning(item.data || {})}
                    </span>
                  </td>
                  <td className="col-pos">
                    <span
                      className="favorite-category-icon"
                      title={getCategoryName(item.category)}
                    >
                      {categoryIconMap[item.category] || '📘'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="word-list-footer">
          <div className="word-count">共 {favoriteWords.length} 个收藏单词</div>
        </div>
      </main>
    </div>
  );
}

export default FavoriteWordListPage;

