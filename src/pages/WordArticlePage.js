import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCategories, generateArticle, saveArticle } from '../utils/api';
import BottomSheet from '../components/BottomSheet';
import TextSelection from '../components/TextSelection';
import WordDetailBottomSheet from '../components/WordDetailBottomSheet';
import { useWordDetail } from '../hooks/useWordDetail';
import Popup from '../components/Popup';
import { formatArticle, extractTitle } from '../utils/text';
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
  const [isSaving, setIsSaving] = useState(false);

  // 使用单词详情 Hook
  const {
    wordDetail,
    isLoadingWordDetail,
    grammarContent,
    isLoadingGrammar,
    articleRef,
    isModalOpen,
    handleCloseModal,
  } = useWordDetail({ enableWordClick: !!article });

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
      Popup.show('文章保存成功！');
    } catch (err) {
      console.error('保存文章失败:', err);
      setError('保存文章失败: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 复制文章到剪贴板
  const handleCopyArticle = async () => {
    if (!article || article.trim() === '') {
      setError('文章内容为空，无法复制');
      return;
    }

    try {
      // 移除markdown加粗标记，保留纯文本
      const cleanArticle = article.replace(/\*\*/g, '');

      // 使用现代 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanArticle);
        Popup.show('文章已复制到剪贴板！');
      } else {
        // 降级方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = cleanArticle;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        Popup.show('文章已复制到剪贴板！');
      }
    } catch (err) {
      console.error('复制文章失败:', err);
      setError('复制文章失败: ' + err.message);
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
              <div className="word-article-action-buttons">
                <button
                  type="button"
                  className="btn btn-secondary word-article-copy-btn"
                  onClick={handleCopyArticle}
                >
                  复制文章
                </button>
                <button
                  type="button"
                  className="btn btn-primary word-article-save-btn"
                  onClick={handleSaveArticle}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : '保存文章'}
                </button>
              </div>
            </div>
            <div
              ref={articleRef}
              className="article-text"
              dangerouslySetInnerHTML={{ __html: formatArticle(article) }}
            />
          </div>
        )}

        {/* 文本选中操作组件 */}
        {article && <TextSelection targetRef={articleRef} />}

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

        {/* 加载提示 */}
        {isLoading && (
          <div className="loading-message">正在生成文章，请稍候...</div>
        )}

      </main>
    </div>
  );
}

export default WordArticlePage;

