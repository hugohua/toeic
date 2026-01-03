import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '../components/Header';
import { getNoteById } from '../utils/api';
import '../index.css';
import './NoteDetailPage.css';
import '../styles/Markdown.css'; // Import unified markdown styles

function NoteDetailPage() {
  // ...
  {/* 笔记内容 - 使用 markdown 渲染 */ }
  <div className="note-detail-body markdown-body">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {note.content}
    </ReactMarkdown>
  </div>
  // ...
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 加载笔记详情
  useEffect(() => {
    loadNote();
  }, [id]);

  const loadNote = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getNoteById(parseInt(id));
      if (!data) {
        setError('笔记不存在');
        setNote(null);
        return;
      }
      setNote(data);
    } catch (err) {
      console.error('加载笔记详情失败:', err);
      setError('加载笔记详情失败: ' + err.message);
      setNote(null);
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="container">
        <Header title="笔记详情" showBack />
        <main className="note-detail-content">
          <div className="loading-message">加载中...</div>
        </main>
      </div>
    );
  }

  if (error && !note) {
    return (
      <div className="container">
        <Header title="笔记详情" showBack />
        <main className="note-detail-content">
          <div className="error-message">{error}</div>
        </main>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="container">
        <Header title="笔记详情" showBack />
        <main className="note-detail-content">
          <div className="error-message">笔记不存在</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="笔记详情" showBack />
      <main className="note-detail-content">
        <div className="note-detail-card">
          {/* 笔记标题 */}
          <div className="note-detail-header">
            <h1 className="note-title">{note.title}</h1>
            <div className="note-meta">
              <span className="note-type">{note.type}</span>
              <span className="note-date">{formatDate(note.created_at)}</span>
            </div>
          </div>

          {/* 笔记内容 - 使用 markdown 渲染 */}
          <div className="note-detail-body markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="error-message">{error}</div>
        )}
      </main>
    </div>
  );
}

export default NoteDetailPage;

