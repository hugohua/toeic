import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WordDetailContent from './WordDetailContent';
import { useSpeechConfig } from '../utils/hooks';
import '../components/TextSelection.css';

/**
 * 单词详情 BottomSheet 内容组件
 * @param {object} props
 * @param {boolean} props.isLoadingWordDetail - 是否正在加载单词详情
 * @param {object} props.wordDetail - 单词详情对象
 * @param {boolean} props.isLoadingTranslation - 是否正在加载翻译
 * @param {string} props.translationContent - 翻译内容
 * @param {function} props.onClose - 关闭回调
 */
function WordDetailBottomSheet({
  isLoadingWordDetail,
  wordDetail,
  isLoadingTranslation,
  translationContent,
  onClose,
}) {
  // 使用 useSpeech，传入当前单词作为 text
  const { start } = useSpeechConfig(wordDetail?.word || '');

  if (isLoadingWordDetail) {
    return <div className="word-detail-loading">加载中...</div>;
  }

  if (wordDetail) {
    return (
      <WordDetailContent
        word={wordDetail}
        mode="modal"
        cssPrefix="word-detail"
        onPlaySound={start}
        onClose={onClose}
        showEtymologyButton={false}
        showFavoriteButton={false}
        showProgress={false}
      />
    );
  }

  if (isLoadingTranslation || translationContent) {
    return (
      <div className="text-selection-sheet">
        <div className="text-selection-header">
          <h3 className="text-selection-title">翻译</h3>
          <button className="text-selection-close" onClick={onClose}>×</button>
        </div>
        <div className="text-selection-content">
          {translationContent ? (
            <div className="text-selection-content-text markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{translationContent}</ReactMarkdown>
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

