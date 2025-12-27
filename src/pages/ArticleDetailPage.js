import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import { getArticleById, getWordByWordAndCategory, searchWords } from '../utils/api';
import WordDetailModal from '../components/WordDetailModal';
import { formatArticle, cleanWordText } from '../utils/text';
import { useDisableScroll } from '../utils/hooks';
import '../index.css';
import './WordArticlePage.css';

function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordDetail, setWordDetail] = useState(null);
  const [isLoadingWordDetail, setIsLoadingWordDetail] = useState(false);
  const articleRef = useRef(null);

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

  // 处理单词点击事件
  const handleWordClick = async (wordText) => {
    if (!wordText || !article) return;
    
    // 清理单词文本（移除可能的标点符号）
    const cleanWord = cleanWordText(wordText);
    if (!cleanWord) return;

    setSelectedWord(cleanWord);
    setIsLoadingWordDetail(true);
    setWordDetail(null);

    try {
      // 从文章的分类中查找
      let found = false;
      const categories = article.categories || [];
      
      for (const category of categories) {
        try {
          const detail = await getWordByWordAndCategory(cleanWord, category);
          if (detail) {
            setWordDetail(detail);
            found = true;
            break;
          }
        } catch (err) {
          // 继续尝试下一个分类
          continue;
        }
      }

      // 如果没找到，尝试搜索所有单词
      if (!found) {
        const searchResults = await searchWords(cleanWord, 10);
        const exactMatch = searchResults.find(w => w.word.toLowerCase() === cleanWord);
        if (exactMatch) {
          // 如果找到精确匹配，获取详情
          try {
            const detail = await getWordByWordAndCategory(cleanWord, exactMatch.category_name);
            if (detail) {
              setWordDetail(detail);
              found = true;
            }
          } catch (err) {
            console.error('获取单词详情失败:', err);
          }
        }
      }

      if (!found) {
        setError(`未找到单词 "${wordText}" 的详情`);
      }
    } catch (err) {
      console.error('查找单词失败:', err);
      setError('查找单词详情失败: ' + err.message);
    } finally {
      setIsLoadingWordDetail(false);
    }
  };


  // 添加点击事件监听
  useEffect(() => {
    if (!article || !articleRef.current) return;

    const handleClick = (e) => {
      const wordElement = e.target.closest('.word-highlight');
      if (wordElement) {
        const wordText = wordElement.getAttribute('data-word');
        if (wordText) {
          handleWordClick(wordText);
        }
      }
    };

    const articleElement = articleRef.current;
    articleElement.addEventListener('click', handleClick);

    return () => {
      articleElement.removeEventListener('click', handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article]);

  // 关闭弹窗
  const handleCloseModal = () => {
    setSelectedWord(null);
    setWordDetail(null);
    setError('');
  };

  // 当浮层打开/关闭时，禁用/启用原页面滚动
  const isModalOpen = selectedWord || wordDetail;
  useDisableScroll(isModalOpen);


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

        {/* 单词详情弹窗 */}
        {(selectedWord || wordDetail) && (
          <div className="word-detail-modal-overlay" onClick={handleCloseModal}>
            <div className="word-detail-modal" onClick={(e) => e.stopPropagation()}>
              {isLoadingWordDetail ? (
                <div className="word-detail-loading">加载中...</div>
              ) : wordDetail ? (
                <WordDetailModal wordDetail={wordDetail} onClose={handleCloseModal} />
              ) : (
                <div className="word-detail-loading">未找到单词详情</div>
              )}
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="error-message">{error}</div>
        )}
      </main>
    </div>
  );
}

export default ArticleDetailPage;

