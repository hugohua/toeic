import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSpeak } from 'react-text-to-speech';

const SpeechContext = createContext(null);

// 全局标记：语音系统是否已通过用户交互激活
let speechActivated = false;

// 语音提供者组件
export function SpeechProvider({ children }) {
  const [voiceURI, setVoiceURI] = useState(null);
  const [isActivated, setIsActivated] = useState(false);
  const activationAttemptedRef = useRef(false);

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

  // 使用 useSpeak hook
  // 根据文档，语音配置（rate, pitch, volume, lang, voiceURI）在 speak() 函数中传入
  // 其他配置可以在 hook 级别传入
  const {
    speechStatus,
    speak,
    pause,
    stop,
  } = useSpeak({
    // 非语音配置可以在 hook 级别设置
    autoPlay: false, // 不自动播放，通过 speak() 函数控制
    highlightText: false, // 不需要高亮文本
  });

  // 激活语音系统（通过用户交互）
  // 使用 useSpeak 的 speak 函数来激活，这样可以确保系统已初始化
  const activateSpeech = useRef(() => {
    if (speechActivated || activationAttemptedRef.current) return;
    
    activationAttemptedRef.current = true;
    
    try {
      // 使用 useSpeak 的 speak 函数播放一个空格来激活系统
      // 这样确保语音系统已初始化
      speak(' ', {
        lang: 'en-US',
        rate: 10, // 极快的速度，几乎瞬间完成
        volume: 0.01, // 极小的音量，几乎听不到
      });
      
      // 立即停止，只用于激活
      setTimeout(() => {
        stop();
        speechActivated = true;
        setIsActivated(true);
        console.log('语音系统已激活');
      }, 10);
    } catch (error) {
      console.log('语音系统激活失败:', error);
      // 即使失败也标记为已尝试
      speechActivated = true;
      setIsActivated(true);
    }
  }).current;

  // 监听用户交互，激活语音系统
  useEffect(() => {
    if (speechActivated || isActivated) return;

    const handleUserInteraction = () => {
      activateSpeech();
      // 移除监听器
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    // 监听各种用户交互事件
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [activateSpeech, isActivated, speak, stop]);

  // 封装 speak 方法，自动停止之前的发音并开始新的
  // 参考 react-text-to-speech 的 demo，直接调用 speak 函数
  // 添加 isUserInteraction 参数，标识是否是用户交互触发的（如点击按钮）
  const speakWord = (text, isUserInteraction = false) => {
    if (!text) return;
    
    // 检查浏览器是否支持 Web Speech API
    if (!window.speechSynthesis) {
      console.warn('浏览器不支持 Web Speech API');
      return;
    }
    
    // 如果是用户交互触发的，确保语音系统已激活
    if (isUserInteraction && (!speechActivated && !isActivated)) {
      activateSpeech();
      // 用户交互时，重新激活标记，确保后续播放正常
      speechActivated = true;
      setIsActivated(true);
    }
    
    try {
      // 获取语音列表
      const voices = window.speechSynthesis.getVoices();
      
      // 获取最终的 voiceURI（优先使用已加载的，否则动态查找）
      let finalVoiceURI = voiceURI;
      if (!finalVoiceURI && voices.length > 0) {
        const usVoice = voices.find(
          (voice) =>
            voice.lang.includes('en-US') &&
            (voice.name.includes('American') || voice.name.includes('US') || voice.name.includes('Samantha'))
        );
        if (usVoice) {
          finalVoiceURI = usVoice.voiceURI;
        } else {
          const enVoice = voices.find((voice) => voice.lang.includes('en'));
          if (enVoice) {
            finalVoiceURI = enVoice.voiceURI;
          }
        }
      }
      
      // 先停止当前正在播放的语音（如果有）
      if (speechStatus === 'started' || speechStatus === 'paused') {
        stop();
        // 如果是用户交互，等待停止完成
        if (isUserInteraction) {
          setTimeout(() => {
            speak(text, {
              lang: 'en-US',
              rate: 0.9,
              pitch: 1.0,
              volume: 1.0,
              voiceURI: finalVoiceURI || undefined,
            });
          }, 50);
          return;
        }
      }
      
      // 直接调用 speak，参考 demo 的方式
      // 根据 API 文档，speak 函数接受 text 和 options
      speak(text, {
        lang: 'en-US',
        rate: 0.9,
        pitch: 1.0,
        volume: 1.0,
        voiceURI: finalVoiceURI || undefined,
      });
      console.log('speakWord 调用:', text, 'isUserInteraction:', isUserInteraction, 'voiceURI:', finalVoiceURI);
    } catch (error) {
      console.error('发音出错:', error);
      // 如果出错，尝试使用原生的 Web Speech API 作为后备
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        if (voiceURI) {
          const voice = voices.find((v) => v.voiceURI === voiceURI);
          if (voice) {
            utterance.voice = voice;
          }
        } else if (voices.length > 0) {
          const usVoice = voices.find(
            (voice) =>
              voice.lang.includes('en-US') &&
              (voice.name.includes('American') || voice.name.includes('US'))
          );
          if (usVoice) {
            utterance.voice = usVoice;
          }
        }
        
        window.speechSynthesis.speak(utterance);
      } catch (fallbackError) {
        console.error('备用发音方案也失败:', fallbackError);
      }
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

