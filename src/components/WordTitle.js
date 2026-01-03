import React from 'react';
import { useSpeechConfig } from '../hooks/useSpeechConfig';
import './WordTitle.css';

/**
 * 单词标题组件，支持发音
 * @param {object} props
 * @param {string} props.word - 单词文本
 * @param {string} props.className - 自定义CSS类名
 */
function WordTitle({ word, className = '' }) {
  const { start } = useSpeechConfig(word);

  return (
    <div
      className={`word-title-clickable word-detail-title ${className}`}
      onClick={() => start()}
      title="点击播放发音"
    >
      {word}
    </div>
  );
}

export default WordTitle;

