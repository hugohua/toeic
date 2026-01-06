import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getAllArticles, deleteArticle } from '../services/api';
import '../index.css';
import './ArticleListPage.css';

function ArticleListPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // 加载文章列表
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAllArticles();
      setArticles(data);
    } catch (err) {
      console.error('加载文章列表失败:', err);
      setError('加载文章列表失败: ' + err.message);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除文章
  const handleDelete = async (articleId, e) => {
    e.stopPropagation();

    if (!window.confirm('确定要删除这篇文章吗？')) {
      return;
    }

    setDeletingId(articleId);
    try {
      await deleteArticle(articleId);
      // 重新加载列表
      await loadArticles();
    } catch (err) {
      console.error('删除文章失败:', err);
      alert('删除文章失败: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 点击文章项，跳转到详情页
  const handleArticleClick = (articleId) => {
    navigate(`/article/${articleId}`);
  };

  if (isLoading) {
    return (
      <div className="container">
        <Header title="文章列表" showBack />
        <main className="article-list-content">
          <div className="loading-message">加载中...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="文章列表" showBack />
      <main className="article-list-content">
        {error && (
          <div className="error-message">{error}</div>
        )}

        {articles.length === 0 ? (
          <div className="empty-message">暂无保存的文章</div>
        ) : (
          <div className="article-list-container">
            <table className="article-list-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>分类</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.id}
                    className="article-list-row"
                    onClick={() => handleArticleClick(article.id)}
                  >
                    <td className="col-title">{article.title}</td>
                    <td className="col-categories">
                      {Array.isArray(article.categories) ? article.categories.join(', ') : ''}
                    </td>
                    <td className="col-date">{formatDate(article.created_at)}</td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={(e) => handleDelete(article.id, e)}
                        disabled={deletingId === article.id}
                        title="删除文章"
                      >
                        {deletingId === article.id ? '删除中...' : '删除'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default ArticleListPage;

