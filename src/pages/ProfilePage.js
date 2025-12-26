import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import {
  getTotalStats,
  getTodayData,
  getRecentDaysData,
  clearTodayData,
  clearAllData,
} from '../utils/storage';
import { getCategories, getWordsByCategory } from '../utils/api';
import { getWordReviewStats } from '../utils/ebbinghaus';

function ProfilePage() {
  const navigate = useNavigate();
  const [todayStats, setTodayStats] = useState({ wordCount: 0, studyTime: 0 });
  const [totalStats, setTotalStats] = useState({
    totalDays: 0,
    totalWords: 0,
    totalTime: 0,
    totalStudySessions: 0,
  });
  const [recentDays, setRecentDays] = useState([]);
  const [wordList, setWordList] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const today = getTodayData();
    setTodayStats({
      wordCount: today.wordCount || 0,
      studyTime: Math.floor((today.studyTime || 0) / 60), // 转换为分钟
    });

    const totals = getTotalStats();
    setTotalStats({
      totalDays: totals.totalDays || 0,
      totalWords: totals.totalWords || 0,
      totalTime: Math.floor((totals.totalTime || 0) / 60),
      totalStudySessions: totals.totalStudySessions || 0,
    });

    const recent = getRecentDaysData(7);
    setRecentDays(
      recent.map((day) => ({
        date: day.date,
        wordCount: day.wordCount || 0,
        studyTime: Math.floor((day.studyTime || 0) / 60),
      }))
    );

    // 加载单词列表
    loadWordList();
  };

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

  const handleClearToday = () => {
    if (window.confirm('确定要清除今天的学习数据吗？')) {
      clearTodayData();
      loadStats();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清除所有学习数据吗？此操作不可恢复！')) {
      clearAllData();
      loadStats();
    }
  };

  const goHome = () => {
    navigate('/');
  };

  return (
    <div className="container">
      <Header title="个人中心" showBack />
      <main className="profile-content">
        {/* 操作按钮区域 - 放在顶部 */}
        <div className="profile-actions">
          <div className="action-buttons-grid">
            <button
              className="profile-action-btn btn-favorite"
              onClick={() => navigate('/favorites')}
              title="查看收藏单词"
            >
              <span className="action-btn-text">收藏单词</span>
            </button>
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
            <button
              className="profile-action-btn btn-article"
              onClick={() => navigate('/article')}
              title="单词文章背诵"
            >
              <span className="action-btn-text">文章背诵</span>
            </button>
          </div>
        </div>

        <div className="stats-card today-stats">
          <h2 className="stats-title">📊 今日学习</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{todayStats.wordCount}</div>
              <div className="stat-label">学习单词</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{todayStats.studyTime}</div>
              <div className="stat-label">学习时长（分钟）</div>
            </div>
          </div>
        </div>

        <div className="stats-card total-stats">
          <h2 className="stats-title">🎯 累计统计</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{totalStats.totalDays}</div>
              <div className="stat-label">学习天数</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{totalStats.totalWords}</div>
              <div className="stat-label">累计单词</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{totalStats.totalTime}</div>
              <div className="stat-label">总时长（分钟）</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{totalStats.totalStudySessions}</div>
              <div className="stat-label">学习次数</div>
            </div>
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

        {recentDays.length > 0 && (
          <div className="recent-days-card">
            <h2 className="stats-title">📅 最近7天</h2>
            <div className="recent-days-list">
              {recentDays.map((day, index) => (
                <div key={index} className="day-item">
                  <div className="day-date">{day.date}</div>
                  <div className="day-stats">
                    <div className="day-stat">{day.wordCount} 个单词</div>
                    <div className="day-stat">{day.studyTime} 分钟</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button className="btn-secondary" onClick={handleClearToday}>
            清除今天数据
          </button>
          <button className="btn-danger" onClick={handleClearAll}>
            清除所有数据
          </button>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
