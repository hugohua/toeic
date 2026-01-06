import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCategories } from '../services/api';

function HomePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCategories();
        // 转换为前端需要的格式
        const formattedCategories = cats.map((cat) => ({
          key: cat.name,
          icon: cat.icon || '📚',
          name: cat.display_name || cat.name,
          desc: cat.desc || '',
        }));
        setCategories(formattedCategories);
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
                >
                  开始学习
                </button>
                <button
                  className="btn-action btn-browse"
                  onClick={() => startBrowse(category.key)}
                >
                  快速浏览
                </button>
                <button
                  className="btn-action btn-list"
                  onClick={() => viewWordList(category.key)}
                >
                  单词列表
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
