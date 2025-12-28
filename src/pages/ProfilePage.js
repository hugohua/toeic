import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCategories, getWordsByCategory } from '../utils/api';
import { getWordReviewStats } from '../utils/ebbinghaus';

function ProfilePage() {
  const navigate = useNavigate();
  const [wordList, setWordList] = useState([]);

  useEffect(() => {
    loadWordList();
  }, []);

  const loadWordList = async () => {
    try {
      const categories = await getCategories();
      const allWords = [];

      // 遍历所有分类，获取单词列表
      for (const category of categories) {
        try {
          const words = await getWordsByCategory(category.name);
          words.forEach((word) => {
            const stats = getWordReviewStats(word.word, category.name);
            if (stats.reviewCount > 0) {
              allWords.push({
                word: word.word,
                category: category.name,
                ...stats,
              });
            }
          });
        } catch (error) {
          console.error(`加载分类 ${category.name} 失败:`, error);
        }
      }

      allWords.sort(
        (a, b) => new Date(b.lastReviewDate) - new Date(a.lastReviewDate)
      );
      setWordList(allWords.slice(0, 50)); // 只显示最近50个
    } catch (error) {
      console.error('加载单词列表失败:', error);
      setWordList([]);
    }
  };


  return (
    <div className="container">
      <Header title="个人中心" showBack />
      <main className="profile-content">
        {/* 学习功能区域 */}
        <div className="profile-actions">
          <h3 className="profile-section-title">学习功能</h3>
          <div className="action-buttons-grid">
            <button
              className="profile-action-btn btn-favorite"
              onClick={() => navigate('/special/favorite')}
              title="查看收藏单词"
            >
              <span className="action-btn-text">收藏单词</span>
            </button>
            <button
              className="profile-action-btn btn-unknown"
              onClick={() => navigate('/special/unknown')}
              title="查看不认识的单词"
            >
              <span className="action-btn-text">不认识单词</span>
            </button>
            <button
              className="profile-action-btn btn-fuzzy"
              onClick={() => navigate('/special/fuzzy')}
              title="查看模糊单词"
            >
              <span className="action-btn-text">模糊单词</span>
            </button>
            <button
              className="profile-action-btn btn-article"
              onClick={() => navigate('/article')}
              title="单词文章背诵"
            >
              <span className="action-btn-text">文章背诵</span>
            </button>
            <button
              className="profile-action-btn btn-note"
              onClick={() => navigate('/notes')}
              title="查看笔记"
            >
              <span className="action-btn-text">笔记</span>
            </button>
          </div>
        </div>

        {/* 后台管理功能区域 */}
        <div className="profile-actions profile-admin-actions">
          <h3 className="profile-section-title">后台管理</h3>
          <div className="action-buttons-grid">
            <button
              className="profile-action-btn btn-import"
              onClick={() => navigate('/import')}
              title="批量导入单词"
            >
              <span className="action-btn-text">导入单词</span>
            </button>
            <button
              className="profile-action-btn btn-category"
              onClick={() => navigate('/category/add')}
              title="新增分类"
            >
              <span className="action-btn-text">新增分类</span>
            </button>
          </div>
        </div>

        {wordList.length > 0 && (
          <div className="word-list-card">
            <h2 className="stats-title">📝 最近学习的单词</h2>
            <div className="word-list">
              {wordList.map((item, index) => (
                <div
                  key={`${item.category}-${item.word}-${index}`}
                  className="word-item"
                >
                  <div className="word-info">
                    <span className="user-word-text">{item.word}</span>
                    <span className="word-category">{item.category}</span>
                  </div>
                  <div className="word-meta">
                    <span className={`word-status ${item.state}`}>
                      {item.state}
                    </span>
                    <span className="word-time">
                      复习 {item.reviewCount} 次
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProfilePage;
