import React from 'react';
import './Loading.css';

/**
 * Loading 组件 - 通用的加载状态组件
 * @param {object} props
 * @param {string} props.text - 加载提示文本，默认为 "加载中..."
 * @param {boolean} props.fullScreen - 是否全屏显示，默认为 false
 * @param {string} props.className - 额外的 CSS 类名
 */
function Loading({ text = '加载中...', fullScreen = false, className = '' }) {
  const containerClass = fullScreen
    ? `loading-container loading-fullscreen ${className}`
    : `loading-container ${className}`;

  return (
    <div className={containerClass}>
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner-circle"></div>
        </div>
        {text && <div className="loading-text">{text}</div>}
      </div>
    </div>
  );
}

export default Loading;

