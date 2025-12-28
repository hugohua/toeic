import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getAllNotes, deleteNote } from '../utils/api';
import '../index.css';
import './NoteListPage.css';

function NoteListPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // 加载笔记列表
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAllNotes();
      setNotes(data);
    } catch (err) {
      console.error('加载笔记列表失败:', err);
      setError('加载笔记列表失败: ' + err.message);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除笔记
  const handleDelete = async (noteId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('确定要删除这条笔记吗？')) {
      return;
    }

    setDeletingId(noteId);
    try {
      await deleteNote(noteId);
      // 重新加载列表
      await loadNotes();
    } catch (err) {
      console.error('删除笔记失败:', err);
      alert('删除笔记失败: ' + err.message);
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

  // 点击笔记项，跳转到详情页
  const handleNoteClick = (noteId) => {
    navigate(`/note/${noteId}`);
  };

  if (isLoading) {
    return (
      <div className="container">
        <Header title="笔记列表" showBack />
        <main className="note-list-content">
          <div className="loading-message">加载中...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="笔记列表" showBack />
      <main className="note-list-content">
        {error && (
          <div className="error-message">{error}</div>
        )}

        {notes.length === 0 ? (
          <div className="empty-message">暂无保存的笔记</div>
        ) : (
          <div className="note-list-container">
            <table className="note-list-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>类型</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr
                    key={note.id}
                    className="note-list-row"
                    onClick={() => handleNoteClick(note.id)}
                  >
                    <td className="col-title">{note.title}</td>
                    <td className="col-type">{note.type}</td>
                    <td className="col-date">{formatDate(note.created_at)}</td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={(e) => handleDelete(note.id, e)}
                        disabled={deletingId === note.id}
                        title="删除笔记"
                      >
                        {deletingId === note.id ? '删除中...' : '删除'}
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

export default NoteListPage;

