import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSpeak } from 'react-text-to-speech';

const SpeechContext = createContext(null);

// 语音提供者组件
export function SpeechProvider({ children }) {
  const [voiceURI, setVoiceURI] = useState(null);

  // 尝试找到美式英语语音
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // 优先查找美式英语语音
      const usVoice = voices.find(
        (voice) =>
          voice.lang.includes('en-US') &&
          (voice.name.includes('American') || voice.name.includes('US') || voice.name.includes('Samantha'))
      );
      
      if (usVoice) {
        setVoiceURI(usVoice.voiceURI);
      } else {
        // 如果没有找到特定的美式语音，使用第一个英语语音
        const enVoice = voices.find((voice) => voice.lang.includes('en'));
        if (enVoice) {
          setVoiceURI(enVoice.voiceURI);
        }
      }
    };

    // 加载语音列表
    loadVoices();
    
    // 某些浏览器需要异步加载语音
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const {
    speechStatus,
    speak,
    pause,
    stop,
  } = useSpeak({
    lang: 'en-US',
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,
    voiceURI: voiceURI || undefined, // 使用找到的美式英语语音，如果找不到则使用浏览器默认
  });

  // 封装 speak 方法，自动停止之前的发音并开始新的
  const speakWord = (text) => {
    if (text) {
      // 先停止当前发音（如果有）
      stop();
      // 使用 window.speechSynthesis.cancel() 确保清除所有队列
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      // 开始新的发音
      speak(text, {
        lang: 'en-US',
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
        voiceURI: voiceURI || undefined,
      });
    }
  };

  const value = {
    speechStatus,
    speak: speakWord,
    pause,
    stop,
  };

  return (
    <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
  );
}

// 使用全局语音的 hook
export function useGlobalSpeech() {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error('useGlobalSpeech must be used within a SpeechProvider');
  }
  return context;
}

