import React from 'react';
import { useSpeechConfig } from '../hooks/useSpeechConfig';
import { extractEnglishText } from '../utils/text';
import './ExampleSentence.css';

/**
 * 例句组件，支持提取英文部分并发音
 * @param {object} props
 * @param {string} props.sentence - 例句文本
 * @param {string} props.className - 自定义CSS类名
 */
function ExampleSentence({ sentence, className = '' }) {
  const { english: englishText, remaining: remainingText } = extractEnglishText(sentence);
  const { start } = useSpeechConfig(englishText);

  return (
    <span className={className}>
      <span
        onClick={() => {
          start();
        }}
        className={`example-sentence-clickable ${className}`}
        title="点击播放发音"
      >
        {englishText}
      </span>
      {remainingText}
    </span>
  );
}

export default ExampleSentence;

