import { useState, useRef, useEffect, useCallback } from 'react';
import { getRecommendedLanguage } from '../utils/languageDetector';
import { generateAudioHash } from '../utils/audioHasher';

// 全局变量：用于存储当前正在播放的音频停止函数
// 实现互斥播放：当新音频开始时，自动停止旧音频
let stopCurrentAudio = null;

// 内存缓存：记录已确认存在的音频Hash，避免重复请求后端检查接口
// Key: audioHash, Value: { url, duration }
const audioAvailabilityCache = new Map();

// ========== WebSocket 连接池管理 ==========
// 全局 WebSocket 连接,复用以减少连接开销
let globalWsConnection = null;
let wsConnectionPromise = null;
let heartbeatInterval = null;
let reconnectTimeout = null;
let wsMessageHandlers = new Map(); // 存储每个请求的消息处理器 (key: requestId)
let currentActiveRequestId = null; // 当前活跃的请求 ID,用于播放互斥

// 生成唯一请求 ID
const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 心跳机制：每 30 秒发送一次 ping
const startHeartbeat = (ws) => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }

    heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ type: 'ping' }));
            } catch (e) {
                console.warn('[WebSocket] 心跳发送失败:', e);
            }
        }
    }, 30000);
};

// 停止心跳
const stopHeartbeat = () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
};

// 清理 WebSocket 连接
const cleanupWebSocket = () => {
    stopHeartbeat();

    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    if (globalWsConnection) {
        try {
            globalWsConnection.close();
        } catch (e) {
            // 忽略关闭错误
        }
        globalWsConnection = null;
    }

    wsConnectionPromise = null;
    wsMessageHandlers.clear();
};

// 获取或创建 WebSocket 连接（连接池核心）
const getOrCreateWebSocket = async () => {
    // 如果连接已存在且可用，直接返回
    if (globalWsConnection && globalWsConnection.readyState === WebSocket.OPEN) {
        return globalWsConnection;
    }

    // 如果正在连接中，等待连接完成
    if (wsConnectionPromise) {
        return wsConnectionPromise;
    }

    // 创建新连接
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/tts`;

    wsConnectionPromise = new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);

        const connectTimeout = setTimeout(() => {
            reject(new Error('WebSocket 连接超时'));
            ws.close();
        }, 5000);

        ws.onopen = () => {
            clearTimeout(connectTimeout);
            console.log('[WebSocket] 连接池连接已建立');
            globalWsConnection = ws;
            wsConnectionPromise = null;

            // 启动心跳
            startHeartbeat(ws);

            resolve(ws);
        };

        ws.onerror = (error) => {
            clearTimeout(connectTimeout);
            console.error('[WebSocket] 连接错误:', error);
            cleanupWebSocket();
            reject(error);
        };

        ws.onclose = () => {
            console.log('[WebSocket] 连接已关闭');
            cleanupWebSocket();

            // 自动重连（5秒后）
            if (!reconnectTimeout) {
                reconnectTimeout = setTimeout(() => {
                    console.log('[WebSocket] 尝试自动重连...');
                    reconnectTimeout = null;
                    getOrCreateWebSocket().catch(e => {
                        console.error('[WebSocket] 自动重连失败:', e);
                    });
                }, 5000);
            }
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                // 处理心跳响应
                if (msg.type === 'pong') {
                    return;
                }

                // 分发消息到对应的处理器
                const requestId = msg.requestId;
                if (requestId && wsMessageHandlers.has(requestId)) {
                    const handler = wsMessageHandlers.get(requestId);
                    handler(msg);
                }
            } catch (e) {
                console.error('[WebSocket] 消息处理失败:', e);
            }
        };
    });

    return wsConnectionPromise;
};

export const useAliyunAudio = () => {
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);  // 加载状态
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const audioContextRef = useRef(null);
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
     * 注意: 不关闭 WebSocket 连接,保持连接池活跃
     */
    const stop = useCallback(() => {
        // 清理当前活跃请求
        if (currentActiveRequestId) {
            wsMessageHandlers.delete(currentActiveRequestId);
            console.log(`[播放互斥] 清理活跃请求: ${currentActiveRequestId}`);
            currentActiveRequestId = null;
        }

        // 如果我是当前正在播放的音频,清除全局引用
        if (stopCurrentAudio === stop) {
            stopCurrentAudio = null;
        }

        // 不再关闭 WebSocket 连接,使用连接池复用
        // WebSocket 连接由全局连接池管理

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                if (audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close();
                }
            } catch (e) { }
            audioContextRef.current = null;
        }

        // 清理缓冲
        pcmBufferRef.current = [];
        bufferLengthRef.current = 0;

        setPlaying(false);
        setLoading(false);  // 清除加载状态
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
     * 开始流式播放（使用连接池）
     */
    const startStreaming = async (text, voice, language) => {
        const requestId = generateRequestId();

        try {
            // 清理旧的活跃请求 (方案 A)
            if (currentActiveRequestId && currentActiveRequestId !== requestId) {
                wsMessageHandlers.delete(currentActiveRequestId);
                console.log(`[播放互斥] startStreaming 清理旧请求: ${currentActiveRequestId}`);
            }

            // 设置为当前活跃请求
            currentActiveRequestId = requestId;
            console.log(`[播放互斥] 新请求开始: ${requestId}`);

            // 重置缓冲
            pcmBufferRef.current = [];
            bufferLengthRef.current = 0;

            // 获取或创建 WebSocket 连接（连接池核心）
            const ws = await getOrCreateWebSocket();

            if (!ws || ws.readyState !== WebSocket.OPEN) {
                throw new Error('WebSocket 连接不可用');
            }

            // 注册消息处理器
            wsMessageHandlers.set(requestId, async (msg) => {
                // 检查是否仍是活跃请求 (方案 A)
                if (currentActiveRequestId !== requestId) {
                    console.log(`[播放互斥] 忽略旧请求消息: ${requestId}`);
                    return;
                }

                try {
                    if (msg.type === 'audio') {
                        if (msg.data && msg.data.length > 0) {
                            const pcmData = base64ToArrayBuffer(msg.data);
                            sampleRateRef.current = msg.sample_rate;

                            // 首个音频块到达,清除加载状态
                            setLoading(false);

                            // 添加到缓冲区
                            pcmBufferRef.current.push(pcmData);
                            bufferLengthRef.current += pcmData.byteLength;

                            // 缓冲区超过阈值（约0.5秒音频,24000Hz * 2bytes * 0.5 = 24000 bytes）
                            // 积攒到一定量再播放,减少 AudioNode 创建数量
                            if (bufferLengthRef.current >= 24000) {
                                await flushAudioBuffer();
                            }
                        }
                    } else if (msg.type === 'done') {
                        // 播放剩余的缓冲数据
                        await flushAudioBuffer();

                        // 清理消息处理器
                        wsMessageHandlers.delete(requestId);
                        if (currentActiveRequestId === requestId) {
                            currentActiveRequestId = null;
                        }

                        // 计算剩余播放时间，延迟停止
                        if (audioContextRef.current) {
                            const now = audioContextRef.current.currentTime;
                            const remaining = Math.max(0, nextStartTimeRef.current - now);

                            setTimeout(() => {
                                stop();
                            }, remaining * 1000 + 500); // 额外 500ms 缓冲
                        } else {
                            stop();
                        }
                    } else if (msg.type === 'error') {
                        console.error('TTS 服务错误:', msg.message);
                        setError(msg.message);
                        wsMessageHandlers.delete(requestId);
                        if (currentActiveRequestId === requestId) {
                            currentActiveRequestId = null;
                        }
                        stop();
                    }
                } catch (err) {
                    console.error('处理消息失败:', err);
                    wsMessageHandlers.delete(requestId);
                    if (currentActiveRequestId === requestId) {
                        currentActiveRequestId = null;
                    }
                    stop();
                }
            });

            // 记录开始时间
            if (audioContextRef.current) {
                startTimeRef.current = audioContextRef.current.currentTime;
            }

            // 发送 TTS 请求（带上 requestId）
            ws.send(JSON.stringify({
                requestId: requestId,
                text: text.replace(/[*#]/g, ''),
                voice: voice,
                language: language
            }));

        } catch (err) {
            console.error('启动播放失败:', err);
            setError('启动播放失败');
            wsMessageHandlers.delete(requestId);
            isRequestActive = false;
            stop();
        }
    };

    /**
     * 播放入口函数
     */
    const play = async (text, voice = 'Elias', language = 'English', playbackRate = 1.0) => {
        if (!text) return;

        // 1. 清理所有旧的消息处理器 (方案 A)
        if (currentActiveRequestId) {
            wsMessageHandlers.delete(currentActiveRequestId);
            console.log(`[播放互斥] 清理旧请求: ${currentActiveRequestId}`);
            currentActiveRequestId = null;
        }

        // 2. 停止当前正在播放的其他音频 (方案 C)
        if (stopCurrentAudio && stopCurrentAudio !== stop) {
            stopCurrentAudio();
        }

        // 3. 强制清理本地播放资源 (方案 C)
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                if (audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close();
                }
            } catch (e) { }
            audioContextRef.current = null;
        }

        // 4. 清理缓冲 (方案 C)
        pcmBufferRef.current = [];
        bufferLengthRef.current = 0;

        // 5. 注册当前停止函数为全局停止函数
        stopCurrentAudio = stop;

        // 6. 重置状态
        setPlaying(true);
        setLoading(true);  // 开始加载
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

                // 1.1 先查内存缓存
                if (audioAvailabilityCache.has(hash)) {
                    const cachedData = audioAvailabilityCache.get(hash);
                    // console.log(`[内存命中] 播放本地文件: ${cachedData.url}`);
                    playLocalAudio(cachedData.url, cachedData.duration, playbackRate, text, voice, detectedLanguage);
                    return;
                }

                // 1.2 查后端接口
                const response = await fetch(`/api/audio/check/${hash}`);

                if (response.ok) {
                    const data = await response.json();
                    if (data.exists && data.url) {
                        // console.log(`[缓存命中] 播放本地文件: ${data.url}`);

                        // 写入内存缓存
                        audioAvailabilityCache.set(hash, {
                            url: data.url,
                            duration: data.duration
                        });

                        playLocalAudio(data.url, data.duration, playbackRate, text, voice, detectedLanguage);
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

    // 进度更新 (针对流式播放的 WebAudio) - 使用 requestAnimationFrame 优化性能
    useEffect(() => {
        let animationFrameId;

        const updateProgress = () => {
            const ctx = audioContextRef.current;
            if (ctx && startTimeRef.current > 0) {
                const elapsed = ctx.currentTime - startTimeRef.current;
                setCurrentTime(elapsed);
                if (totalDurationRef.current > 0) {
                    setProgress((elapsed / totalDurationRef.current) * 100);
                }
            }

            if (playing && audioContextRef.current) {
                animationFrameId = requestAnimationFrame(updateProgress);
            }
        };

        if (playing && audioContextRef.current) {
            animationFrameId = requestAnimationFrame(updateProgress);
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [playing]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    /**
     * 播放本地音频文件
     */
    const playLocalAudio = (url, cachedDuration, playbackRate, text, voice, detectedLanguage) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.playbackRate = playbackRate;

        audio.oncanplaythrough = () => {
            // 本地音频准备好,清除加载状态
            setLoading(false);

            if (!Number.isNaN(audio.duration)) {
                setDuration(audio.duration);
                totalDurationRef.current = audio.duration;
                // 更新缓存中的时长信息（如果之前没有）
                if (!cachedDuration || cachedDuration === 0) {
                    const hash = generateAudioHash(text.replace(/[*#]/g, '').trim(), voice, detectedLanguage);
                    if (audioAvailabilityCache.has(hash)) {
                        const data = audioAvailabilityCache.get(hash);
                        data.duration = audio.duration;
                        audioAvailabilityCache.set(hash, data);
                    }
                }
            } else if (cachedDuration > 0) {
                setDuration(cachedDuration);
                totalDurationRef.current = cachedDuration;
            }

            audio.play().catch(e => {
                console.error('本地播放失败:', e);
                // 播放失败可能是文件损坏,重新走流式作为兜底
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

        audio.onerror = () => {
            console.error('本地音频加载错误');
            startStreaming(text, voice, detectedLanguage);
        };
    };

    return {
        play,
        stop,
        playing,
        loading,  // 添加 loading 状态
        error,
        progress,
        duration,
        currentTime
    };
};
