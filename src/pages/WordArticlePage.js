import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCategories, generateArticle, getWordByWord, saveArticle } from '../utils/api';
import WordDetailModal from '../components/WordDetailModal';
import { formatArticle, extractTitle, cleanWordText } from '../utils/text';
import '../index.css';
import './WordArticlePage.css';

function WordArticlePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [article, setArticle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordDetail, setWordDetail] = useState(null);
  const [isLoadingWordDetail, setIsLoadingWordDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const articleRef = useRef(null);

  // 加载分类列表
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
        setError('加载分类列表失败: ' + error.message);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  // 切换分类选择
  const toggleCategory = (categoryKey) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      return newSet;
    });
  };

  // 生成文章（流式输出）
  const handleGenerateArticle = async () => {
    if (selectedCategories.size === 0) {
      setError('请至少选择一个分类');
      return;
    }

    setIsLoading(true);
    setError('');
    setArticle('');

    try {
      const categoryArray = Array.from(selectedCategories);
      
      // 使用流式 API
      await generateArticle(
        categoryArray,
        // onChunk: 接收每个内容块
        (chunk) => {
          setArticle((prev) => prev + chunk);
        },
        // onError: 错误处理
        (err) => {
          console.error('生成文章失败:', err);
          setError(err.message || '生成文章失败，请稍后重试');
          setIsLoading(false);
        },
        // onComplete: 完成回调
        () => {
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error('生成文章失败:', err);
      setError(err.message || '生成文章失败，请稍后重试');
      setIsLoading(false);
    }
  };

  // 处理单词点击事件
  const handleWordClick = async (wordText) => {
    if (!wordText) return;
    
    // 清理单词文本（移除可能的标点符号）
    const cleanWord = cleanWordText(wordText);
    if (!cleanWord) return;

    setSelectedWord(cleanWord);
    setIsLoadingWordDetail(true);
    setWordDetail(null);
    setError('');

    try {
      // 直接根据单词获取详情，不依赖分类
      const detail = await getWordByWord(cleanWord);
      if (detail) {
        setWordDetail(detail);
      } else {
        setError(`未找到单词 "${wordText}" 的详情`);
      }
    } catch (err) {
      console.error('获取单词详情失败:', err);
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


  // 保存文章
  const handleSaveArticle = async () => {
    if (!article || article.trim() === '') {
      setError('文章内容为空，无法保存');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const title = extractTitle(article);
      const categoryArray = Array.from(selectedCategories);
      
      await saveArticle(title, article, categoryArray);
      alert('文章保存成功！');
    } catch (err) {
      console.error('保存文章失败:', err);
      setError('保存文章失败: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoadingCategories) {
    return (
      <div className="container">
        <Header title="单词文章背诵" showBack />
        <main className="article-content">
          <div className="loading-message">加载分类列表中...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="单词文章背诵" showBack />
      <main className="article-content">
        {/* 查看已保存文章链接 */}
        <div className="word-article-actions">
          <button
            type="button"
            className="btn btn-secondary word-article-view-btn"
            onClick={() => navigate('/articles')}
          >
            查看已保存文章
          </button>
        </div>

        {/* 分类选择区域 */}
        <div className="category-selection">
          <h3 className="section-title">选择分类（可多选）</h3>
          {categories.length === 0 ? (
            <div className="error-message">暂无分类数据</div>
          ) : (
            <>
              <div className="category-buttons">
                {categories.map((category) => {
                  const isSelected = selectedCategories.has(category.key);
                  return (
                    <button
                      key={category.key}
                      type="button"
                      className={`category-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleCategory(category.key)}
                    >
                      <span className="category-btn-icon">{category.icon}</span>
                      <span className="category-btn-name">{category.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="selected-count">
                已选择 {selectedCategories.size} 个分类
              </div>
            </>
          )}
        </div>

        {/* 生成按钮 */}
        <div className="generate-section">
          <button
            type="button"
            className="btn btn-primary btn-generate"
            onClick={handleGenerateArticle}
            disabled={isLoading || selectedCategories.size === 0}
          >
            {isLoading ? '生成中...' : '生成文章'}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="error-message">{error}</div>
        )}

        {/* 文章显示区域 */}
        {article && (
          <div className="article-display">
            <div className="word-article-title-section">
              <h3 className="section-title">生成的文章</h3>
              <button
                type="button"
                className="btn btn-primary word-article-save-btn"
                onClick={handleSaveArticle}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存文章'}
              </button>
            </div>
            <div
              ref={articleRef}
              className="article-text"
              dangerouslySetInnerHTML={{ __html: formatArticle(article) }}
            />
          </div>
        )}

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

        {/* 加载提示 */}
        {isLoading && (
          <div className="loading-message">正在生成文章，请稍候...</div>
        )}
      </main>
    </div>
  );
}

export default WordArticlePage;

