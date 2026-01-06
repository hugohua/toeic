import React, { useState, useRef, useEffect } from 'react';
import './AudioPlayer.css';

/**
 * 实时语音播放组件
 * 基于 WebSocket + Web Audio API 实现流式 TTS 播放
 * 
 * @param {Object} props
 * @param {string} props.text - 要播放的文本内容
 * @param {string} props.voice - 音色，默认 Cherry
 * @param {string} props.language - 语言，默认 Chinese
 * @param {string} props.className - 自定义样式类名
 */
function AudioPlayer({ text, voice = 'Cherry', language = 'Chinese', className = '' }) {
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState('');

    const audioContextRef = useRef(null);
    const wsRef = useRef(null);
    const nextStartTimeRef = useRef(0);

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
     * 播放音频帧
     * 将 PCM 数据转换为 AudioBuffer 并播放
     */
    const playAudioFrame = async (pcmData, sampleRate) => {
        try {
            // 初始化 AudioContext
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            const audioContext = audioContextRef.current;

            // PCM Int16 → Float32 转换
            const int16Array = new Int16Array(pcmData);
            const float32Array = new Float32Array(int16Array.length);

            for (let i = 0; i < int16Array.length; i++) {
                // 归一化到 -1.0 ~ 1.0
                float32Array[i] = int16Array[i] / 32768.0;
            }

            // 创建 AudioBuffer
            const audioBuffer = audioContext.createBuffer(
                1,  // 单声道
                float32Array.length,
                sampleRate
            );
            audioBuffer.getChannelData(0).set(float32Array);

            // 创建音频源
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            // 计算播放时间，实现无缝衔接
            const startTime = Math.max(
                nextStartTimeRef.current,
                audioContext.currentTime
            );
            source.start(startTime);

            // 更新下一个块的开始时间
            nextStartTimeRef.current = startTime + audioBuffer.duration;

        } catch (err) {
            console.error('播放音频帧失败:', err);
            setError('音频播放失败');
        }
    };

    /**
     * 处理播放/停止
     */
    const handleTogglePlay = async () => {
        if (playing) {
            // 停止播放
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setPlaying(false);
            setError('');
            return;
        }

        if (!text || !text.trim()) {
            setError('没有可播放的内容');
            return;
        }

        setPlaying(true);
        setError('');
        nextStartTimeRef.current = 0;

        try {
            // 连接 WebSocket
            const ws = new WebSocket('ws://localhost:8000/ws/tts');
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket 连接成功');
                // 发送 TTS 请求
                ws.send(JSON.stringify({
                    text: text.replace(/[*#]/g, ''),  // 清理 Markdown 标记
                    voice: voice,
                    language: language
                }));
            };

            ws.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'audio') {
                        // 接收到音频数据
                        const pcmData = base64ToArrayBuffer(msg.data);
                        await playAudioFrame(pcmData, msg.sample_rate);

                    } else if (msg.type === 'done') {
                        // 播放完成
                        console.log('TTS 播放完成');
                        setTimeout(() => {
                            setPlaying(false);
                            ws.close();
                        }, 1000);

                    } else if (msg.type === 'error') {
                        // 服务端错误
                        console.error('TTS 服务错误:', msg.message);
                        setError(msg.message || 'TTS 服务错误');
                        setPlaying(false);
                        ws.close();
                    }
                } catch (err) {
                    console.error('处理消息失败:', err);
                    setError('处理音频数据失败');
                    setPlaying(false);
                    ws.close();
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket 错误:', error);
                setError('连接失败，请确保 Python TTS 服务正在运行');
                setPlaying(false);
            };

            ws.onclose = (event) => {
                console.log('WebSocket 连接关闭');
                if (!event.wasClean) {
                    console.error('连接异常关闭');
                }
                setPlaying(false);
            };

        } catch (err) {
            console.error('启动播放失败:', err);
            setError('启动播放失败');
            setPlaying(false);
        }
    };

    // 组件卸载时清理资源
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    return (
        <div className={`audio-player ${className}`}>
            <button
                className={`audio-player-button ${playing ? 'playing' : ''}`}
                onClick={handleTogglePlay}
                title={playing ? '停止播放' : '播放语音'}
                disabled={!text || !text.trim()}
            >
                {playing ? (
                    <span className="audio-player-icon">⏹</span>
                ) : (
                    <span className="audio-player-icon">🔊</span>
                )}
                <span className="audio-player-text">
                    {playing ? '停止' : '播放'}
                </span>
            </button>

            {error && (
                <div className="audio-player-error" title={error}>
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}

export default AudioPlayer;
