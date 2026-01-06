import { useState, useRef, useEffect, useCallback } from 'react';
import { getRecommendedLanguage } from '../utils/languageDetector';
import { generateAudioHash } from '../utils/audioHasher';

// 全局变量：用于存储当前正在播放的音频停止函数
// 实现互斥播放：当新音频开始时，自动停止旧音频
let stopCurrentAudio = null;

export const useAliyunAudio = () => {
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const audioContextRef = useRef(null);
    const wsRef = useRef(null);
    const audioRef = useRef(null); // 处理本地音频播放
    const nextStartTimeRef = useRef(0);
    const startTimeRef = useRef(0);
    const totalDurationRef = useRef(0);

    // 音频缓冲 (解决长文章播放时创建过多 AudioNode 的问题)
    const pcmBufferRef = useRef([]); // 存储 ArrayBuffer
    const bufferLengthRef = useRef(0); // 当前总字节数
    const sampleRateRef = useRef(24000);

    /**
     * 停止播放（清理资源）
     */
    const stop = useCallback(() => {
        // 如果我是当前正在播放的音频，清除全局引用
        if (stopCurrentAudio === stop) {
            stopCurrentAudio = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch (e) { }
            audioContextRef.current = null;
        }

        // 清理缓冲
        pcmBufferRef.current = [];
        bufferLengthRef.current = 0;

        setPlaying(false);
        setError('');
        setProgress(0);
        setCurrentTime(0);
        setDuration(0);
        totalDurationRef.current = 0;
    }, []);

    /**
     * Base64 转 ArrayBuffer
     */
    const base64ToArrayBuffer = (base64) => {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    /**
     * 播放音频帧（Web Audio API）
     */
    const playAudioFrame = async (pcmData, sampleRate = 24000, playbackRate = 1.0) => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (!pcmData || pcmData.byteLength === 0) return;

            const audioContext = audioContextRef.current;
            if (!audioContext) return;

            const frameCount = pcmData.byteLength / 2; // PCM 16bit
            if (frameCount <= 0) return;

            const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
            const channelData = audioBuffer.getChannelData(0);
            const view = new DataView(pcmData);
            for (let i = 0; i < channelData.length; i++) {
                channelData[i] = view.getInt16(i * 2, true) / 32768.0;
            }

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = playbackRate;
            source.connect(audioContext.destination);

            const startTime = Math.max(nextStartTimeRef.current, audioContext.currentTime);
            source.start(startTime);

            const adjustedDuration = audioBuffer.duration / playbackRate;
            totalDurationRef.current += adjustedDuration;
            nextStartTimeRef.current = startTime + adjustedDuration;

            setDuration(totalDurationRef.current);

        } catch (err) {
            console.error('播放音频帧失败:', err);
        }
    };

    /**
     * 清空并播放缓冲区中的音频
     */
    const flushAudioBuffer = async () => {
        if (pcmBufferRef.current.length === 0) return;

        // 合并所有缓冲块
        const totalLength = bufferLengthRef.current;
        const combinedBuffer = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of pcmBufferRef.current) {
            combinedBuffer.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        }

        // 播放合并后的音频
        await playAudioFrame(combinedBuffer.buffer, sampleRateRef.current);

        // 重置缓冲区
        pcmBufferRef.current = [];
        bufferLengthRef.current = 0;
    };

    /**
     * 开始流式播放
     */
    const startStreaming = async (text, voice, language) => {
        try {
            // 重置缓冲
            pcmBufferRef.current = [];
            bufferLengthRef.current = 0;

            // 确保之前的连接已关闭
            if (wsRef.current) wsRef.current.close();

            // 使用相对路径，让反向代理处理连接
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/tts`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                // console.log('WebSocket 连接成功');
                if (audioContextRef.current) {
                    startTimeRef.current = audioContextRef.current.currentTime;
                }

                ws.send(JSON.stringify({
                    text: text.replace(/[*#]/g, ''),
                    voice: voice,
                    language: language
                }));
            };

            ws.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'audio') {
                        if (msg.data && msg.data.length > 0) {
                            const pcmData = base64ToArrayBuffer(msg.data);
                            sampleRateRef.current = msg.sample_rate;

                            // 添加到缓冲区
                            pcmBufferRef.current.push(pcmData);
                            bufferLengthRef.current += pcmData.byteLength;

                            // 缓冲区超过阈值（约0.5秒音频，24000Hz * 2bytes * 0.5 = 24000 bytes）
                            // 积攒到一定量再播放，减少 AudioNode 创建数量
                            if (bufferLengthRef.current >= 24000) {
                                await flushAudioBuffer();
                            }
                        }
                    } else if (msg.type === 'done') {
                        // console.log('TTS 数据传输完成');

                        // 播放剩余的缓冲数据
                        await flushAudioBuffer();

                        // 计算剩余播放时间，延迟停止
                        if (audioContextRef.current) {
                            const now = audioContextRef.current.currentTime;
                            const remaining = Math.max(0, nextStartTimeRef.current - now);
                            // console.log(`[TTS] 等待播放结束，剩余: ${remaining.toFixed(2)}s`);

                            setTimeout(() => {
                                stop();
                            }, remaining * 1000 + 500); // 额外 500ms 缓冲
                        } else {
                            stop();
                        }
                    } else if (msg.type === 'error') {
                        console.error('TTS 服务错误:', msg.message);
                        setError(msg.message);
                        stop();
                    }
                } catch (err) {
                    console.error('处理消息失败:', err);
                    stop();
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket 错误:', error);
                setError('连接失败');
                stop();
            };

            ws.onclose = () => {
                // 如果是主动关闭(playing=false)，不需要做太多事情
            };

        } catch (err) {
            console.error('启动播放失败:', err);
            setError('启动播放失败');
            stop();
        }
    };

    /**
     * 播放入口函数
     */
    const play = async (text, voice = 'Cherry', language = 'Chinese', playbackRate = 1.0) => {
        if (!text) return;

        // 全局互斥：停止当前正在播放的其他音频
        if (stopCurrentAudio && stopCurrentAudio !== stop) {
            stopCurrentAudio();
        }
        // 注册当前停止函数为全局停止函数
        stopCurrentAudio = stop;

        // 重置状态
        if (wsRef.current) wsRef.current.close();
        if (audioRef.current) audioRef.current.pause();
        if (audioContextRef.current) audioContextRef.current.close();

        pcmBufferRef.current = [];
        bufferLengthRef.current = 0;

        setPlaying(true);
        setError('');
        setProgress(0);
        setCurrentTime(0);
        setDuration(0);
        nextStartTimeRef.current = 0;
        totalDurationRef.current = 0;

        const detectedLanguage = language === 'Auto' || !language
            ? getRecommendedLanguage(text)
            : language;

        // 1. 尝试本地缓存 (仅短文本)
        if (text.length <= 500) {
            try {
                const hash = generateAudioHash(text.replace(/[*#]/g, '').trim(), voice, detectedLanguage);
                const response = await fetch(`/api/audio/check/${hash}`);

                if (response.ok) {
                    const data = await response.json();
                    if (data.exists && data.url) {
                        // console.log(`[缓存命中] 播放本地文件: ${data.url}`);

                        const audio = new Audio(data.url);
                        audioRef.current = audio;
                        audio.playbackRate = playbackRate;

                        audio.oncanplaythrough = () => {
                            if (!Number.isNaN(audio.duration)) {
                                setDuration(audio.duration);
                                totalDurationRef.current = audio.duration;
                            }
                            audio.play().catch(e => {
                                console.error('本地播放失败:', e);
                                startStreaming(text, voice, detectedLanguage);
                            });
                        };

                        audio.ontimeupdate = () => {
                            setCurrentTime(audio.currentTime);
                            if (audio.duration > 0) {
                                setProgress((audio.currentTime / audio.duration) * 100);
                            }
                        };

                        audio.onended = () => {
                            stop();
                        };

                        return; // 命中缓存，结束
                    }
                }
            } catch (err) {
                console.warn('[缓存检查] 失败，降级流式:', err);
            }
        }

        // 2. 降级为流式播放
        startStreaming(text, voice, detectedLanguage);
    };

    // 进度更新 (针对流式播放的 WebAudio)
    useEffect(() => {
        let intervalId;
        if (playing && audioContextRef.current) {
            intervalId = setInterval(() => {
                const ctx = audioContextRef.current;
                if (ctx && startTimeRef.current > 0) {
                    const elapsed = ctx.currentTime - startTimeRef.current;
                    setCurrentTime(elapsed);
                    if (totalDurationRef.current > 0) {
                        setProgress((elapsed / totalDurationRef.current) * 100);
                    }
                }
            }, 100);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [playing]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    return {
        play,
        stop,
        playing,
        error,
        progress,
        duration,
        currentTime
    };
};
