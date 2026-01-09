import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getAllCategories } from '../utils/app';

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
        <Header title="选择学习场景" subtitle="选择一个场景开始背单词" />
        <main className="main-content">
          <div className="empty-message">加载中...</div>
        </main>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="container">
        <Header title="选择学习场景" subtitle="选择一个场景开始背单词" />
        <main className="main-content">
          <div className="empty-message">暂无分类数据</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="选择学习场景" subtitle="选择一个场景开始背单词" />
      <main className="main-content">
        <div className="category-list">
          {categories.map((category, index) => (
            <div
              key={category.key}
              className="category-card"
              data-category={category.key}
            >
              <div className="category-number">{index + 1}</div>
              <div className="category-icon">{category.icon}</div>
              <h2>{category.name}</h2>
              <p className="category-desc">{category.desc}</p>
              <div className="category-actions">
                <button
                  className="btn-action btn-study"
                  onClick={() => startStudy(category.key)}
                  title="开始学习"
                >
                  <span className="iconfont icon-play-circle"></span>
                </button>
                <button
                  className="btn-action btn-study"
                  onClick={() => startPlaylist(category.key)}
                  title="随身听"
                >
                  <span className="iconfont icon-audio"></span>
                </button>
                <button
                  className="btn-action btn-browse"
                  onClick={() => startBrowse(category.key)}
                  title="快速浏览"
                >
                  <span className="iconfont icon-eye"></span>
                </button>
                <button
                  className="btn-action btn-list"
                  onClick={() => viewWordList(category.key)}
                  title="单词列表"
                >
                  <span className="iconfont icon-unorderedlist"></span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default HomePage;
