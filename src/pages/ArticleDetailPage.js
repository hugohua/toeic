import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '../components/Header';
import { getArticleById, getNotesByArticleId } from '../utils/api';
import BottomSheet from '../components/BottomSheet';
import TextSelection from '../components/TextSelection';
import WordDetailBottomSheet from '../components/WordDetailBottomSheet';
import { useWordDetail } from '../utils/hooks';
import { formatArticle } from '../utils/text';
import '../index.css';
import './WordArticlePage.css';

function ArticleDetailPage() {
  const { id } = useParams();
  const articleId = parseInt(id);
  const [article, setArticle] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNotes, setSelectedNotes] = useState([]); // 当前选中的笔记列表
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

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

  // 加载文章详情和笔记
  useEffect(() => {
    loadArticle();
  }, [id]);

  // 加载笔记列表
  useEffect(() => {
    if (articleId) {
      loadNotes();
    }
  }, [articleId]);

  const loadArticle = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getArticleById(articleId);
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

  const loadNotes = async () => {
    try {
      const notesData = await getNotesByArticleId(articleId);
      setNotes(notesData || []);
    } catch (err) {
      console.error('加载笔记列表失败:', err);
      // 笔记加载失败不影响文章显示，静默失败
    }
  };

  // 处理笔记高亮点击
  useEffect(() => {
    if (!articleRef.current || !article) return;

    const handleNoteClick = (e) => {
      // 如果点击的是 word-highlight，不处理笔记点击，让单词高亮正常工作
      if (e.target.closest('.word-highlight')) {
        return;
      }

      const target = e.target.closest('.note-highlight');
      if (!target) return;

      // 如果点击的是 note-badge，也触发笔记显示
      // 但点击 word-highlight 时已经返回了，所以这里安全

      e.preventDefault();
      e.stopPropagation();

      const noteIdsStr = target.getAttribute('data-note-ids');
      if (!noteIdsStr) return;

      const noteIds = noteIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      const clickedNotes = notes.filter(note => noteIds.includes(note.id));

      if (clickedNotes.length > 0) {
        setSelectedNotes(clickedNotes);
        setIsNoteModalOpen(true);
      }
    };

    const articleElement = articleRef.current;
    articleElement.addEventListener('click', handleNoteClick);

    return () => {
      articleElement.removeEventListener('click', handleNoteClick);
    };
  }, [articleRef, article, notes]);



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
            dangerouslySetInnerHTML={{ __html: formatArticle(article.content, notes) }}
          />
        </div>

        {/* 文本选中操作组件 */}
        <TextSelection
          targetRef={articleRef}
          articleId={articleId}
          onNoteSaved={loadNotes}
        />

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

        {/* 笔记详情弹窗 - BottomSheet样式 */}
        <BottomSheet isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)}>
          <div className="text-selection-sheet">
            <div className="text-selection-header">
              <h3 className="text-selection-title">
                {selectedNotes.length > 1 ? `笔记 (${selectedNotes.length})` : '笔记'}
              </h3>
              <button className="text-selection-close" onClick={() => setIsNoteModalOpen(false)}>×</button>
            </div>
            <div className="text-selection-content">
              {selectedNotes.length === 1 ? (
                <div className="note-detail">
                  <div className="note-detail-title">{selectedNotes[0].title}</div>
                  <div className="note-detail-type">类型：{selectedNotes[0].type}</div>
                  <div className="note-detail-content markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedNotes[0].content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="note-list">
                  {selectedNotes.map((note, index) => (
                    <div key={note.id} className="note-item">
                      <div className="note-item-header">
                        <span className="note-item-number">{index + 1}</span>
                        <span className="note-item-title">{note.title}</span>
                        <span className="note-item-type">{note.type}</span>
                      </div>
                      <div className="note-item-content markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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

