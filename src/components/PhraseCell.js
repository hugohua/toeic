import React from 'react';
import InlinePlayButton from './InlinePlayButton';
import './PhraseCell.css';

/**
 * 短语播放组件 - 简化版
 * 一行文本 + 播放图标
 * 
 * @param {Object} props
 * @param {string} props.phraseText - 短语文本
 */
function PhraseCell({ phraseText }) {
  if (!phraseText) return null;

  return (
    <div className="phrase-cell">
      <span className="phrase-text">{phraseText}</span>
      <InlinePlayButton text={phraseText} size={14} />
    </div>
  );
}

export default PhraseCell;
