import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { createCategory } from '../utils/api';
import '../index.css';

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
      <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="category-key"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              分类标识（key）<span style={{ color: 'red' }}>*</span>
            </label>
            <input
              id="category-key"
              type="text"
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value)}
              placeholder="例如: new_category"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
              disabled={isLoading}
            />
            <div
              style={{
                marginTop: '5px',
                fontSize: '14px',
                color: '#666',
              }}
            >
              只能包含字母、数字和下划线，用于系统内部标识
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="display-name"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              中文名称<span style={{ color: 'red' }}>*</span>
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如: 新分类名称"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
              disabled={isLoading}
            />
            <div
              style={{
                marginTop: '5px',
                fontSize: '14px',
                color: '#666',
              }}
            >
              用于在界面上显示的中文名称
            </div>
          </div>

          {message.text && (
            <div
              style={{
                padding: '12px',
                marginBottom: '20px',
                borderRadius: '4px',
                backgroundColor:
                  message.type === 'success' ? '#d4edda' : '#f8d7da',
                color: message.type === 'success' ? '#155724' : '#721c24',
                border: `1px solid ${
                  message.type === 'success' ? '#c3e6cb' : '#f5c6cb'
                }`,
              }}
            >
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: isLoading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isLoading ? '创建中...' : '创建分类'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        </form>

        <div
          style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            说明：
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
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

