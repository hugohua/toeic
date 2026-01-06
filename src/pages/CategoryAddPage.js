import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { createCategory } from '../services/api';
import '../index.css';
import './CategoryAddPage.css';

function CategoryAddPage() {
  const navigate = useNavigate();
  const [categoryKey, setCategoryKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 验证分类 key（只能包含字母、数字和下划线）
  const validateCategoryKey = (key) => {
    if (!key || key.trim() === '') {
      return '分类标识（key）不能为空';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      return '分类标识只能包含字母、数字和下划线';
    }
    return null;
  };

  // 处理提交
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 验证分类 key
    const keyError = validateCategoryKey(categoryKey);
    if (keyError) {
      setMessage({ type: 'error', text: keyError });
      return;
    }

    if (!displayName || displayName.trim() === '') {
      setMessage({ type: 'error', text: '中文名称不能为空' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await createCategory(categoryKey.trim(), displayName.trim());

      setMessage({
        type: 'success',
        text: `分类 "${displayName}" 创建成功！`,
      });

      // 清空表单
      setCategoryKey('');
      setDisplayName('');

      // 3秒后返回上一页
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (error) {
      console.error('创建分类失败:', error);
      setMessage({
        type: 'error',
        text: '创建分类失败: ' + (error.message || '未知错误'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <Header title="新增分类" showBack />
      <main className="category-add-content">
        <form onSubmit={handleSubmit}>
          <div className="category-add-form-group">
            <label
              htmlFor="category-key"
              className="category-add-label"
            >
              分类标识（key）<span className="category-add-label-required">*</span>
            </label>
            <input
              id="category-key"
              type="text"
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value)}
              placeholder="例如: new_category"
              className="category-add-input"
              disabled={isLoading}
            />
            <div className="category-add-hint">
              只能包含字母、数字和下划线，用于系统内部标识
            </div>
          </div>

          <div className="category-add-form-group">
            <label
              htmlFor="display-name"
              className="category-add-label"
            >
              中文名称<span className="category-add-label-required">*</span>
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如: 新分类名称"
              className="category-add-input"
              disabled={isLoading}
            />
            <div className="category-add-hint">
              用于在界面上显示的中文名称
            </div>
          </div>

          {message.text && (
            <div
              className={`category-add-message ${message.type === 'success'
                  ? 'category-add-message-success'
                  : 'category-add-message-error'
                }`}
            >
              {message.text}
            </div>
          )}

          <div className="category-add-actions">
            <button
              type="submit"
              disabled={isLoading}
              className="category-add-submit-btn"
            >
              {isLoading ? '创建中...' : '创建分类'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="category-add-cancel-btn"
            >
              取消
            </button>
          </div>
        </form>

        <div className="category-add-info">
          <div className="category-add-info-title">
            说明：
          </div>
          <ul className="category-add-info-list">
            <li>
              <strong>分类标识（key）</strong>：用于系统内部标识，一旦创建不能修改
            </li>
            <li>
              <strong>中文名称</strong>：用于在界面上显示，可以随时修改
            </li>
            <li>分类标识必须唯一，不能与现有分类重复</li>
            <li>创建分类后，可以在"批量导入单词"页面中使用该分类</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default CategoryAddPage;

