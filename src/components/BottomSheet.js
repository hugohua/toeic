import React, { useState, useEffect, useRef } from 'react';
import { useDisableScroll } from '../hooks/useDisableScroll';
import './BottomSheet.css';

/**
 * BottomSheet 组件 - 从底部滑出的抽屉式浮层
 * @param {object} props
 * @param {boolean} props.isOpen - 是否显示
 * @param {function} props.onClose - 关闭回调
 * @param {React.ReactNode} props.children - 内容
 * @param {number} props.defaultHeight - 默认高度（屏幕高度的百分比，0-1之间）
 * @param {number} props.minHeight - 最小高度（像素）
 * @param {number} props.maxHeight - 最大高度（像素）
 */
function BottomSheet({
  isOpen,
  onClose,
  children,
  defaultHeight = 0.6,
  minHeight = 200,
  maxHeight = null
}) {
  const bottomSheetRef = useRef(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({ startY: 0, startHeight: 0 });

  // 当浮层打开/关闭时，禁用/启用原页面滚动
  useDisableScroll(isOpen);

  // 初始化底部抽屉高度
  useEffect(() => {
    if (isOpen && bottomSheetRef.current) {
      const defaultHeightPx = window.innerHeight * defaultHeight;
      const maxHeightPx = maxHeight || window.innerHeight - 100;
      const initialHeight = Math.min(defaultHeightPx, maxHeightPx);
      setSheetHeight(initialHeight);
      bottomSheetRef.current.style.height = `${initialHeight}px`;
    } else if (!isOpen) {
      setSheetHeight(0);
    }
  }, [isOpen, defaultHeight, maxHeight]);

  // 拖动处理
  const handleDragStart = (e) => {
    if (!bottomSheetRef.current) return;
    setIsDragging(true);
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const currentHeight = sheetHeight || window.innerHeight * defaultHeight;
    dragStateRef.current = {
      startY: clientY,
      startHeight: currentHeight
    };
    e.preventDefault();
  };

  const handleDragMove = (e) => {
    if (!isDragging || !bottomSheetRef.current) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const { startY, startHeight } = dragStateRef.current;
    const deltaY = startY - clientY; // 向上拖动为正值
    const maxHeightPx = maxHeight || window.innerHeight - 100;

    // 允许拖动小于 minHeight，以此给用户"即将关闭"的反馈
    // 这里的 50 是绝对最小高度，防止拖得太小看不见
    const newHeight = Math.max(50, Math.min(maxHeightPx, startHeight + deltaY));

    setSheetHeight(newHeight);
    if (bottomSheetRef.current) {
      bottomSheetRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleDragEnd = () => {
    if (!bottomSheetRef.current) {
      setIsDragging(false);
      return;
    }

    const currentHeight = bottomSheetRef.current.offsetHeight;
    const closeThreshold = 150; // 低于这个高度则关闭

    if (currentHeight < closeThreshold) {
      // 高度太小，认为是关闭操作
      onClose();
    } else if (currentHeight < minHeight) {
      // 高度在 minHeight 和 closeThreshold 之间，回弹到 minHeight
      setSheetHeight(minHeight);
      bottomSheetRef.current.style.height = `${minHeight}px`;
      setIsDragging(false);
    } else {
      // 高度正常，保持当前高度
      setIsDragging(false);
    }
  };

  // 添加拖动事件监听
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      e.preventDefault();
      handleDragMove(e);
    };
    const handleEnd = () => handleDragEnd();

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // 点击遮罩层关闭
  const handleOverlayClick = (e) => {
    // 如果点击的是遮罩层本身（不是底部抽屉），则关闭
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;
  return (
    <div className="bottom-sheet-overlay" onClick={handleOverlayClick}>
      <div
        ref={bottomSheetRef}
        className={`bottom-sheet ${isDragging ? 'dragging' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 拖动手柄 */}
        <div
          className="bottom-sheet-handle"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="bottom-sheet-handle-bar"></div>
        </div>

        {/* 内容区域 */}
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default BottomSheet;

