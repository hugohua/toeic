import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getAllWordMemories } from '../utils/ebbinghaus';

function ProfilePage() {
  const navigate = useNavigate();
  const [wordList, setWordList] = useState([]);

  useEffect(() => {
    loadWordList();
  }, []);

  const loadWordList = async () => {
    try {
      // 直接从localStorage获取所有复习记录
      const allMemories = getAllWordMemories();
      
      if (allMemories.length === 0) {
        setWordList([]);
        return;
      }

      // 按lastReviewDate排序，取前50个
      const sortedMemories = allMemories
        .filter((memory) => memory.lastReviewDate) // 确保有lastReviewDate
        .sort(
          (a, b) => new Date(b.lastReviewDate) - new Date(a.lastReviewDate)
        )
        .slice(0, 50);

      setWordList(sortedMemories);
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
              className="profile-action-btn"
              onClick={() => navigate('/special/favorite')}
              title="查看收藏单词"
            >
              <span className="action-btn-text">收藏单词</span>
            </button>
            <button
              className="profile-action-btn"
              onClick={() => navigate('/special/unknown')}
              title="查看不认识的单词"
            >
              <span className="action-btn-text">不认识单词</span>
            </button>
            <button
              className="profile-action-btn"
              onClick={() => navigate('/special/fuzzy')}
              title="查看模糊单词"
            >
              <span className="action-btn-text">模糊单词</span>
            </button>
            <button
              className="profile-action-btn"
              onClick={() => navigate('/article')}
              title="单词文章背诵"
            >
              <span className="action-btn-text">文章背诵</span>
            </button>
            <button
              className="profile-action-btn"
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
              className="profile-action-btn"
              onClick={() => navigate('/import')}
              title="批量导入单词"
            >
              <span className="action-btn-text">导入单词</span>
            </button>
            <button
              className="profile-action-btn"
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
