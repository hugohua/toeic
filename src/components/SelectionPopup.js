import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './SelectionPopup.css';

function SelectionPopup({ targetElement, onTranslate }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const popupRef = useRef(null);

  // 获取选中文本的位置
  const getSelectionPosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // 检查是否有选中的文本
    const text = selection.toString().trim();
    if (!text) {
      return null;
    }

    return {
      text,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  };

  // 计算浮层位置
  const calculatePopupPosition = (selectionRect) => {
    if (!selectionRect) {
      return { top: 0, left: 0 };
    }

    const popupHeight = 50; // 浮层高度
    const popupWidth = 100; // 浮层宽度
    const offset = 10; // 距离选中文本的偏移

    // 使用 getBoundingClientRect 获取的位置是相对于视口的
    let top = selectionRect.top - popupHeight - offset;
    let left = selectionRect.left + selectionRect.width / 2 - popupWidth / 2;

    // 如果上方空间不足，显示在下方
    if (top < 10) {
      top = selectionRect.top + selectionRect.height + offset;
    }

    // 确保不超出视口
    const viewportWidth = window.innerWidth;
    if (left < 10) {
      left = 10;
    } else if (left + popupWidth > viewportWidth - 10) {
      left = viewportWidth - popupWidth - 10;
    }

    // 转换为相对于页面的绝对位置
    return {
      top: top + window.scrollY,
      left: left + window.scrollX,
    };
  };

  // 处理文本选择
  const handleSelection = () => {
    const selectionInfo = getSelectionPosition();
    
    if (selectionInfo && selectionInfo.text) {
      setSelectedText(selectionInfo.text);
      const popupPos = calculatePopupPosition({
        top: selectionInfo.top,
        left: selectionInfo.left,
        width: selectionInfo.width,
        height: selectionInfo.height,
      });
      setPosition(popupPos);
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setSelectedText('');
    }
  };

  // 处理翻译按钮点击
  const handleTranslate = () => {
    if (onTranslate && selectedText) {
      onTranslate(selectedText);
    }
    // 清除选择
    window.getSelection().removeAllRanges();
    setIsVisible(false);
    setSelectedText('');
  };

  useEffect(() => {
    if (!targetElement) return;

    // 监听鼠标和触摸事件
    const handleMouseUp = () => {
      setTimeout(handleSelection, 10); // 延迟以确保选择已完成
    };

    const handleTouchEnd = () => {
      setTimeout(handleSelection, 300); // 移动端延迟稍长
    };

    // 处理点击外部区域
    const handleClickOutside = (e) => {
      // 如果点击的是浮层本身，不处理
      if (popupRef.current && popupRef.current.contains(e.target)) {
        return;
      }
      
      // 如果点击的是目标元素内的其他区域，检查是否有选中文本
      if (targetElement && targetElement.contains(e.target)) {
        // 延迟检查，因为点击可能会清除选择
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.toString().trim() === '') {
            setIsVisible(false);
            setSelectedText('');
          }
        }, 10);
      } else {
        // 点击的是外部区域，直接隐藏
        setIsVisible(false);
        setSelectedText('');
        // 清除选择
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
      }
    };

    // 监听点击外部（使用捕获阶段，确保能捕获到所有点击）
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);

    targetElement.addEventListener('mouseup', handleMouseUp);
    targetElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      targetElement.removeEventListener('mouseup', handleMouseUp);
      targetElement.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [targetElement]);

  // 监听滚动，隐藏浮层
  useEffect(() => {
    const handleScroll = () => {
      if (isVisible) {
        setIsVisible(false);
        setSelectedText('');
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible]);

  if (!isVisible || !selectedText) {
    return null;
  }

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={popupRef}
          className="selection-popup"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          <button
            className="selection-popup-btn"
            onClick={handleTranslate}
          >
            翻译
          </button>
        </div>,
        document.body
      )
    : null;
}

export default SelectionPopup;

