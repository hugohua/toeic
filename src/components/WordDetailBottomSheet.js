import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WordDetailModal from './WordDetailModal';
import '../components/TextSelection.css';

/**
 * 单词详情 BottomSheet 内容组件
 * @param {object} props
 * @param {boolean} props.isLoadingWordDetail - 是否正在加载单词详情
 * @param {object} props.wordDetail - 单词详情对象
 * @param {boolean} props.isLoadingGrammar - 是否正在加载语法解析
 * @param {string} props.grammarContent - 语法解析内容
 * @param {function} props.onClose - 关闭回调
 */
function WordDetailBottomSheet({
  isLoadingWordDetail,
  wordDetail,
  isLoadingGrammar,
  grammarContent,
  onClose,
}) {
  if (isLoadingWordDetail) {
    return <div className="word-detail-loading">加载中...</div>;
  }

  if (wordDetail) {
    return <WordDetailModal wordDetail={wordDetail} onClose={onClose} />;
  }

  if (isLoadingGrammar || grammarContent) {
    return (
      <div className="text-selection-sheet">
        <div className="text-selection-header">
          <h3 className="text-selection-title">语法解析</h3>
          <button className="text-selection-close" onClick={onClose}>×</button>
        </div>
        <div className="text-selection-content">
          {grammarContent ? (
            <div className="text-selection-content-text markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{grammarContent}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-selection-loading">加载中...</div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default WordDetailBottomSheet;

