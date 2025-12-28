import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Popup.css';

// 全局 Popup 管理器
class PopupManager {
  constructor() {
    this.setVisible = null;
    this.setMessage = null;
  }

  register(setVisible, setMessage) {
    this.setVisible = setVisible;
    this.setMessage = setMessage;
  }

  show(message, duration = 1000) {
    if (this.setMessage && this.setVisible) {
      this.setMessage(message);
      this.setVisible(true);
      
      setTimeout(() => {
        this.setVisible(false);
        setTimeout(() => {
          this.setMessage('');
        }, 300); // 等待淡出动画完成
      }, duration);
    }
  }
}

// 创建全局单例
const popupManager = new PopupManager();

// Popup 容器组件（需要在 App 中渲染一次）
export function PopupContainer() {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 注册到全局管理器
    popupManager.register(setIsVisible, setMessage);
    
    return () => {
      popupManager.register(null, null);
    };
  }, []);

  if (!isVisible || !message) {
    return null;
  }

  return typeof document !== 'undefined'
    ? createPortal(<div className="popup">{message}</div>, document.body)
    : null;
}

// 导出 show 函数
export function show(message, duration = 1000) {
  popupManager.show(message, duration);
}

// 默认导出 Popup 对象，包含 show 方法
const Popup = {
  show,
};

export default Popup;
