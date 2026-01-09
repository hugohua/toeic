import React from 'react';
import AudioPlayer from './AudioPlayer';
import { AUDIO_CONFIG } from '../utils/audioConfig';
import './PhraseCell.css';

/**
 * 短语播放组件
 * 使用简化版 AudioPlayer 实现
 * 
 * @param {Object} props
 * @param {string} props.phraseText - 短语文本
 * @param {string} props.voice - 音色，默认 Elias
 */
function PhraseCell({ phraseText, voice = AUDIO_CONFIG.DEFAULT_VOICE }) {
  return (
    <span className="phrase-cell-inline">
      <span className="phrase-text">{phraseText}</span>
      <AudioPlayer
        text={phraseText}
        voice={voice}
        showAdvanced={false}
        className="audio-player-simple"
      />
    </span>
  );
}

export default PhraseCell;
