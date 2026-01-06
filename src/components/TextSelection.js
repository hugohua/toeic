import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BottomSheet from './BottomSheet';
import { grammarAnalyze, saveNote } from '../services/api';
import Popup from './Popup';
import EtymologyBottomSheet from './EtymologyBottomSheet';
import './TextSelection.css';
import '../styles/Markdown.css';

/**
 * TextSelection 组件 - 文本选中操作组件
 * @param {object} props
  * @param {React.RefObject} props.targetRef - 目标元素的 ref，用于监听选中事件
  * @param {number} props.articleId - 文章ID，用于保存笔记时关联文章
  */
function TextSelection({ targetRef, articleId, onNoteSaved }) {
  const [selectedText, setSelectedText] = useState('');
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [showButtons, setShowButtons] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [bottomSheetContent, setBottomSheetContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState(''); // 'etymology' 或 'grammar'
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showEtymology, setShowEtymology] = useState(false); // 控制构词法 BottomSheet
  const buttonGroupRef = useRef(null);
  const abortControllerRef = useRef(null);
  const markdownContentRef = useRef(null);

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
    // 按钮显示在选中文本上方，估算按钮高度约50px（包括padding和间距）
    const topY = rect.top - 50;

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

  // 构词法
  const handleEtymology = () => {
    if (!selectedText) return;
    setShowButtons(false);
    setShowEtymology(true);
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
    setIsSaved(false);

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

  // 保存笔记
  const handleSaveNote = async () => {
    if (!selectedText || !bottomSheetContent || !actionType) {
      return;
    }

    if (!articleId) {
      alert('无法保存笔记：缺少文章ID');
      return;
    }

    setIsSaving(true);
    try {
      await saveNote(articleId, selectedText, bottomSheetContent, actionType);
      Popup.show('保存成功');
      setIsSaved(true);
      if (onNoteSaved) {
        onNoteSaved();
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
      Popup.show('保存失败: ' + error.message, 2000);
    } finally {
      setIsSaving(false);
    }
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
    setIsSaved(false);
    // 清除选中
    window.getSelection().removeAllRanges();
  };

  // 关闭构词法 BottomSheet
  const handleCloseEtymology = () => {
    setShowEtymology(false);
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
                {actionType === 'grammar' ? '语法解析' : ''}
              </h3>
              <div className="text-selection-header-actions">
                {bottomSheetContent && actionType && !isSaved && (
                  <button
                    className="text-selection-save"
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    title="保存笔记"
                  >
                    {isSaving ? '保存中...' : '保存笔记'}
                  </button>
                )}
                <button className="text-selection-close" onClick={handleCloseBottomSheet}>×</button>
              </div>
            </div>
            <div className="text-selection-content">
              {bottomSheetContent ? (
                <div className="text-selection-content-text markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{bottomSheetContent}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-selection-loading">加载中...</div>
              )}
            </div>
          </div>
        </BottomSheet>

        <EtymologyBottomSheet
          isOpen={showEtymology}
          onClose={handleCloseEtymology}
          word={selectedText}
        />
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
            handleEtymology();
          }}
          title="构词法"
        >
          构词法
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
              {actionType === 'grammar' ? '语法解析' : ''}
            </h3>
            <div className="text-selection-header-actions">
              {bottomSheetContent && actionType && !isSaved && (
                <button
                  className="text-selection-save"
                  onClick={handleSaveNote}
                  disabled={isSaving}
                  title="保存笔记"
                >
                  {isSaving ? '保存中...' : '保存笔记'}
                </button>
              )}
              <button className="text-selection-close" onClick={handleCloseBottomSheet}>×</button>
            </div>
          </div>
          <div className="text-selection-content">
            {bottomSheetContent ? (
              <div className="text-selection-content-text markdown-body">
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
