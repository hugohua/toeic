import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BottomSheet from './BottomSheet';
import { translate, grammarAnalyze } from '../utils/api';
import './TextSelection.css';

/**
 * TextSelection 组件 - 文本选中操作组件
 * @param {object} props
 * @param {React.RefObject} props.targetRef - 目标元素的 ref，用于监听选中事件
 */
function TextSelection({ targetRef }) {
  const [selectedText, setSelectedText] = useState('');
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [showButtons, setShowButtons] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [bottomSheetContent, setBottomSheetContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState(''); // 'translate' 或 'grammar'
  const buttonGroupRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 获取选中文本
  const getSelectedText = () => {
    if (window.getSelection) {
      return window.getSelection().toString().trim();
    }
    return '';
  };

  // 获取选中文本的位置
  const getSelectionPosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // 使用 fixed 定位，相对于视口
    const centerX = rect.left + rect.width / 2;
    const topY = rect.bottom + 10;
    
    return {
      top: topY,
      left: centerX,
    };
  };

  // 处理文本选中
  const handleSelection = () => {
    const text = getSelectedText();
    
    if (text && text.length > 0) {
      const position = getSelectionPosition();
      if (position) {
        setSelectedText(text);
        setButtonPosition(position);
        setShowButtons(true);
      }
    } else {
      setShowButtons(false);
      setSelectedText('');
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 组件卸载时中止正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // 监听文本选中事件
  useEffect(() => {
    if (!targetRef || !targetRef.current) return;

    const targetElement = targetRef.current;

    // 鼠标选中事件
    const handleMouseUp = () => {
      setTimeout(() => {
        handleSelection();
      }, 10);
    };

    // 触摸选中事件
    const handleTouchEnd = () => {
      setTimeout(() => {
        handleSelection();
      }, 300); // 移动端需要稍长延迟
    };

    // 点击其他地方时隐藏按钮
    const handleClickOutside = (e) => {
      if (buttonGroupRef.current && !buttonGroupRef.current.contains(e.target)) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim() === '') {
          setShowButtons(false);
          setSelectedText('');
        }
      }
    };

    targetElement.addEventListener('mouseup', handleMouseUp);
    targetElement.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('click', handleClickOutside);

    return () => {
      targetElement.removeEventListener('mouseup', handleMouseUp);
      targetElement.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [targetRef]);

  // 滚动时更新按钮位置
  useEffect(() => {
    if (!showButtons) return;

    const handleScroll = () => {
      const position = getSelectionPosition();
      if (position) {
        setButtonPosition(position);
      } else {
        // 如果选中已消失，隐藏按钮
        setShowButtons(false);
        setSelectedText('');
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showButtons, selectedText]);

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      setShowButtons(false);
      // 可以显示一个提示，但这里先简单处理
      window.getSelection().removeAllRanges();
    } catch (err) {
      console.error('复制失败:', err);
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = selectedText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setShowButtons(false);
        window.getSelection().removeAllRanges();
      } catch (e) {
        console.error('复制失败:', e);
      }
      document.body.removeChild(textArea);
    }
  };

  // 翻译
  const handleTranslate = () => {
    if (!selectedText) return;
    
    // 如果已有正在进行的请求，先中止
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setShowButtons(false);
    setIsBottomSheetOpen(true);
    setBottomSheetContent('');
    setIsLoading(true);
    setActionType('translate');

    translate(
      selectedText,
      // onChunk: 接收每个内容块，使用函数式更新确保流式输出
      (chunk) => {
        if (!abortController.signal.aborted) {
          setBottomSheetContent((prev) => prev + chunk);
        }
      },
      // onError: 错误处理
      (error) => {
        if (!abortController.signal.aborted) {
          console.error('翻译错误:', error);
          setBottomSheetContent(`翻译失败: ${error.message}`);
          setIsLoading(false);
        }
      },
      // onComplete: 完成回调
      () => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
        abortControllerRef.current = null;
      },
      abortController.signal
    );
  };

  // 语法解析
  const handleGrammarAnalyze = () => {
    if (!selectedText) return;
    
    // 如果已有正在进行的请求，先中止
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setShowButtons(false);
    setIsBottomSheetOpen(true);
    setBottomSheetContent('');
    setIsLoading(true);
    setActionType('grammar');

    grammarAnalyze(
      selectedText,
      // onChunk: 接收每个内容块，使用函数式更新确保流式输出
      (chunk) => {
        if (!abortController.signal.aborted) {
          setBottomSheetContent((prev) => prev + chunk);
        }
      },
      // onError: 错误处理
      (error) => {
        if (!abortController.signal.aborted) {
          console.error('语法解析错误:', error);
          setBottomSheetContent(`语法解析失败: ${error.message}`);
          setIsLoading(false);
        }
      },
      // onComplete: 完成回调
      () => {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
        abortControllerRef.current = null;
      },
      abortController.signal
    );
  };

  // 关闭 BottomSheet
  const handleCloseBottomSheet = () => {
    // 中止正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setIsBottomSheetOpen(false);
    setBottomSheetContent('');
    setIsLoading(false);
    setActionType('');
    // 清除选中
    window.getSelection().removeAllRanges();
  };

  // 调整按钮位置，确保不超出屏幕边界
  useEffect(() => {
    if (showButtons && buttonGroupRef.current) {
      const buttonGroup = buttonGroupRef.current;
      const rect = buttonGroup.getBoundingClientRect();
      const width = rect.width;
      const windowWidth = window.innerWidth;
      
      // 检查是否超出右边界
      if (buttonPosition.left + width / 2 > windowWidth) {
        setButtonPosition(prev => ({
          ...prev,
          left: windowWidth - width / 2 - 10,
        }));
      }
      // 检查是否超出左边界
      else if (buttonPosition.left - width / 2 < 0) {
        setButtonPosition(prev => ({
          ...prev,
          left: width / 2 + 10,
        }));
      }
    }
  }, [showButtons, buttonPosition]);

  if (!showButtons || !selectedText) {
    return (
      <>
        <BottomSheet isOpen={isBottomSheetOpen} onClose={handleCloseBottomSheet}>
          <div className="text-selection-sheet">
            <div className="text-selection-header">
              <h3 className="text-selection-title">
                {actionType === 'translate' ? '翻译' : actionType === 'grammar' ? '语法解析' : ''}
              </h3>
              <button className="text-selection-close" onClick={handleCloseBottomSheet}>×</button>
            </div>
            <div className="text-selection-content">
              {bottomSheetContent ? (
                <div className="text-selection-content-text">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{bottomSheetContent}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-selection-loading">加载中...</div>
              )}
            </div>
          </div>
        </BottomSheet>
      </>
    );
  }

  return (
    <>
      <div
        ref={buttonGroupRef}
        className="text-selection-buttons"
        style={{
          position: 'fixed',
          top: `${buttonPosition.top}px`,
          left: `${buttonPosition.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="text-selection-button"
          onClick={(e) => {
            e.stopPropagation();
            handleTranslate();
          }}
          title="翻译"
        >
          翻译
        </button>
        <button
          className="text-selection-button"
          onClick={(e) => {
            e.stopPropagation();
            handleGrammarAnalyze();
          }}
          title="语法解析"
        >
          语法解析
        </button>
        <button
          className="text-selection-button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          title="复制"
        >
          复制
        </button>
      </div>

      <BottomSheet isOpen={isBottomSheetOpen} onClose={handleCloseBottomSheet}>
        <div className="text-selection-sheet">
          <div className="text-selection-header">
            <h3 className="text-selection-title">
              {actionType === 'translate' ? '翻译' : actionType === 'grammar' ? '语法解析' : ''}
            </h3>
            <button className="text-selection-close" onClick={handleCloseBottomSheet}>×</button>
          </div>
          <div className="text-selection-content">
            {bottomSheetContent ? (
              <div className="text-selection-content-text">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{bottomSheetContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-selection-loading">加载中...</div>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}

export default TextSelection;

