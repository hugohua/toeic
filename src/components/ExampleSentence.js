import React from 'react';
import AudioPlayer from './AudioPlayer';
import { extractEnglishText } from '../utils/text';
import './ExampleSentence.css';

/**
 * 例句组件,支持提取英文部分并发音
 * @param {object} props
 * @param {string} props.sentence - 例句文本
 * @param {string} props.className - 自定义CSS类名
 */
function ExampleSentence({ sentence, className = '' }) {
  const { english: englishText, remaining: remainingText } = extractEnglishText(sentence);

  return (
    <span className={`example-sentence-container ${className}`}>
      <span className="example-sentence-content">
        <span className="example-sentence-text">{englishText}</span>
        {remainingText && <span className="example-sentence-remaining">{remainingText}</span>}
      </span>
      {englishText && (
        <AudioPlayer
          text={englishText}
          showAdvanced={false}
          className="example-sentence-player"
        />
      )}
    </span>
  );
}

export default ExampleSentence;
