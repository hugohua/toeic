import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import { getArticleById } from '../utils/api';
import BottomSheet from '../components/BottomSheet';
import TextSelection from '../components/TextSelection';
import WordDetailBottomSheet from '../components/WordDetailBottomSheet';
import { useWordDetail } from '../utils/hooks';
import { formatArticle } from '../utils/text';
import '../index.css';
import './WordArticlePage.css';

function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 使用单词详情 Hook
  const {
    wordDetail,
    isLoadingWordDetail,
    grammarContent,
    isLoadingGrammar,
    articleRef,
    isModalOpen,
    handleCloseModal,
  } = useWordDetail({ article, enableWordClick: !!article });

  // 加载文章详情
  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getArticleById(parseInt(id));
      if (!data) {
        setError('文章不存在');
        setArticle(null);
        return;
      }
      setArticle(data);
    } catch (err) {
      console.error('加载文章详情失败:', err);
      setError('加载文章详情失败: ' + err.message);
      setArticle(null);
    } finally {
      setIsLoading(false);
    }
  };



  if (isLoading) {
    return (
      <div className="container">
        <Header title="文章详情" showBack />
        <main className="article-content">
          <div className="loading-message">加载中...</div>
        </main>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="container">
        <Header title="文章详情" showBack />
        <main className="article-content">
          <div className="error-message">{error}</div>
        </main>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container">
        <Header title="文章详情" showBack />
        <main className="article-content">
          <div className="error-message">文章不存在</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="文章详情" showBack />
      <main className="article-content">
        {/* 文章标题 */}
        <div className="article-display">
          {/*<h3 className="section-title">{article.title}</h3>*/}
          <div
            ref={articleRef}
            className="article-text"
            dangerouslySetInnerHTML={{ __html: formatArticle(article.content) }}
          />
        </div>

        {/* 文本选中操作组件 */}
        <TextSelection targetRef={articleRef} />

        {/* 单词详情弹窗 - BottomSheet样式 */}
        <BottomSheet isOpen={isModalOpen} onClose={handleCloseModal}>
          <WordDetailBottomSheet
            isLoadingWordDetail={isLoadingWordDetail}
            wordDetail={wordDetail}
            isLoadingGrammar={isLoadingGrammar}
            grammarContent={grammarContent}
            onClose={handleCloseModal}
          />
        </BottomSheet>

        {/* 错误提示 */}
        {error && (
          <div className="error-message">{error}</div>
        )}

      </main>
    </div>
  );
}

export default ArticleDetailPage;

