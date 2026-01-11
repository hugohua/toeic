import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Headphones, Eye, List } from 'lucide-react';
import Header from '../components/Header';
import { getAllCategories } from '../utils/app';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getAllCategories();
        setCategories(cats);
      } catch (error) {
        console.error('加载分类列表失败:', error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, []);

  const startStudy = (category) => {
    navigate(`/study/${category}`);
  };

  const startBrowse = (category) => {
    navigate(`/browse/${category}`);
  };

  const viewWordList = (category) => {
    navigate(`/list/${category}`);
  };

  const startPlaylist = (category) => {
    navigate('/playlist', { state: { category } });
  };

  if (isLoading) {
    return (
      <div className="container">
        {/* Custom header not needed here if AppShell handles it, but keeping for consistency */}
        <div className="home-container">
          <div className="home-header">
            <h1 className="home-title">选择学习场景</h1>
            <p className="home-subtitle">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="container">
        <div className="home-container">
          <div className="home-header">
            <h1 className="home-title">选择学习场景</h1>
            <p className="home-subtitle">暂无分类数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container scroll-viewport">
      <div className="home-container">
        <div className="home-header">
          <h1 className="home-title">每日学习</h1>
          <p className="home-subtitle">选择一个场景开始背单词</p>
        </div>

        <div className="category-list">
          {categories.map((category, index) => (
            <div
              key={category.key}
              className="category-card"
              data-category={category.key}
            >
              <div className="category-number">{index + 1}</div>

              <div className="category-card-header">
                <div className="category-icon-wrapper">
                  {category.icon || '📚'}
                </div>
              </div>

              <div className="category-info">
                <h2>{category.name}</h2>
                <p className="category-desc">{category.desc}</p>
              </div>

              <div className="category-actions">
                <div className="action-btn-wrapper">
                  <button
                    className="btn-home-action primary"
                    onClick={() => startStudy(category.key)}
                    title="开始学习"
                  >
                    <PlayCircle size={24} strokeWidth={2.5} />
                  </button>
                  <span className="action-label">开始</span>
                </div>

                <div className="action-btn-wrapper">
                  <button
                    className="btn-home-action"
                    onClick={() => startPlaylist(category.key)}
                    title="随身听"
                  >
                    <Headphones size={22} />
                  </button>
                  <span className="action-label">听力</span>
                </div>

                <div className="action-btn-wrapper">
                  <button
                    className="btn-home-action"
                    onClick={() => startBrowse(category.key)}
                    title="快速浏览"
                  >
                    <Eye size={22} />
                  </button>
                  <span className="action-label">浏览</span>
                </div>

                <div className="action-btn-wrapper">
                  <button
                    className="btn-home-action"
                    onClick={() => viewWordList(category.key)}
                    title="单词列表"
                  >
                    <List size={22} />
                  </button>
                  <span className="action-label">列表</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
