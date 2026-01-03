import React from 'react';
import { useSpeechConfig } from '../hooks/useSpeechConfig';
import './ConfusingWordCell.css';

/**
 * 易混淆单词单元格组件，支持发音功能
 * @param {object} props
 * @param {string} props.wordText - 单词文本
 * @param {string} props.className - 自定义CSS类名
 */
function ConfusingWordCell({ wordText, className = '' }) {
  const { start } = useSpeechConfig(wordText);

  return (
    <strong
      onClick={() => {
        start();
      }}
      className={`confusing-word-clickable ${className}`}
      title="点击播放发音"
    >
      {wordText}
    </strong>
  );
}

export default ConfusingWordCell;

