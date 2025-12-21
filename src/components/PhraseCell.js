import React from 'react';
import { useSpeech } from 'react-text-to-speech';

// 短语组件，支持发音功能
function PhraseCell({ phraseText }) {
  const { start } = useSpeech({
    text: phraseText || '',
    pitch: 1,
    rate: 1,
    volume: 1,
  });

  return (
    <span
      onClick={() => {
        start();
      }}
      style={{ cursor: 'pointer' }}
      title="点击播放发音"
    >
      {phraseText}
    </span>
  );
}

export default PhraseCell;

