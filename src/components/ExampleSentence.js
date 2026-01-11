import React from 'react';
import InlinePlayButton from './InlinePlayButton';
import { extractEnglishText } from '../utils/text';
import './ExampleSentence.css';

/**
 * 例句组件,支持提取英文部分并发音
 * @param {object} props
 * @param {object} props.sentence - 例句对象 { en, cn } 或字符串
 * @param {string} props.className - 自定义CSS类名
 */
function ExampleSentence({ sentence, className = '' }) {
  // Handle both object { en, cn } and string formats
  let englishText = '';
  let chineseText = '';

  if (typeof sentence === 'object' && sentence !== null) {
    englishText = sentence.en || '';
    chineseText = sentence.cn || '';
  } else if (typeof sentence === 'string') {
    const { english, remaining } = extractEnglishText(sentence);
    englishText = english;
    chineseText = remaining;
  }

  if (!englishText && !chineseText) return null;

  return (
    <div className={`example-sentence ${className}`}>
      <div className="example-en">
        <span>{englishText}</span>
        {englishText && <InlinePlayButton text={englishText} size={14} />}
      </div>
      {chineseText && <div className="example-cn">{chineseText}</div>}
    </div>
  );
}

export default ExampleSentence;
