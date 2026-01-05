import React, { useState, useRef, useEffect } from 'react';

const AudioPlayer = ({ text }) => {
    const [loading, setLoading] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const audioContextRef = useRef(null);
    const wsRef = useRef(null);
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);
    const nextStartTimeRef = useRef(0);

    // 初始化 AudioContext
    useEffect(() => {
        return () => {
            // 清理
            if (audioContextRef.current) {
                audioContext.current.close();
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Base64 转 ArrayBuffer
    const base64ToArrayBuffer = (base64) => {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // 播放音频帧
    const playAudioFrame = async (pcmData, sampleRate) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;

        // 将 PCM 数据转换为 AudioBuffer
        // PCM 格式: 16-bit signed integer, mono
        const int16Array = new Int16Array(pcmData);
        const float32Array = new Float32Array(int16Array.length);

        // 转换为 float32 (-1.0 到 1.0)
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }

        // 创建 AudioBuffer
        const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
        audioBuffer.getChannelData(0).set(float32Array);

        // 创建音频源节点
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        // 计算播放时间，实现无缝衔接
        const startTime = Math.max(nextStartTimeRef.current, audioContext.currentTime);
        source.start(startTime);

        // 更新下一个块的开始时间
        nextStartTimeRef.current = startTime + audioBuffer.duration;

        console.log(`Playing audio frame, duration: ${audioBuffer.duration}s, start: ${startTime}`);
    };

    const stopPlayback = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setPlaying(false);
        setLoading(false);
        setProgress(0);
        isPlayingRef.current = false;
        nextStartTimeRef.current = 0;
        audioQueueRef.current = [];
    };

    const handlePlay = async () => {
        if (playing) {
            stopPlayback();
            return;
        }

        setLoading(true);
        setPlaying(true);
        isPlayingRef.current = true;

        try {
            // 创建或恢复 AudioContext
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            nextStartTimeRef.current = audioContextRef.current.currentTime;

            // 清理文本
            const cleanText = text.replace(/[*#]/g, '');

            // 连接 WebSocket
            const ws = new WebSocket('ws://localhost:8000/ws/tts');
            wsRef.current = ws;

            let chunkCount = 0;

            ws.onopen = () => {
                console.log('WebSocket connected');
                setLoading(false);

                // 发送 TTS 请求
                ws.send(JSON.stringify({
                    text: cleanText,
                    voice: 'Cherry',
                    language: 'Chinese'
                }));
            };

            ws.onmessage = async (event) => {
                const msg = JSON.parse(event.data);

                if (msg.type === 'audio') {
                    chunkCount++;

                    // 解码 base64 音频数据
                    const pcmData = base64ToArrayBuffer(msg.data);

                    // 播放音频帧
                    await playAudioFrame(pcmData, msg.sample_rate);

                    // 更新进度
                    setProgress(Math.min(95, chunkCount * 2));

                } else if (msg.type === 'done') {
                    console.log(`TTS completed, received ${msg.total_chunks} chunks`);
                    setProgress(100);

                    // 等待播放完成
                    setTimeout(() => {
                        setPlaying(false);
                        setProgress(0);
                    }, 1000);

                    ws.close();

                } else if (msg.type === 'error') {
                    console.error('TTS Error:', msg.message);
                    alert('语音合成失败: ' + msg.message);
                    stopPlayback();
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                alert('连接失败，请确保 Python TTS 服务正在运行 (端口 8000)');
                stopPlayback();
            };

            ws.onclose = () => {
                console.log('WebSocket closed');
                if (isPlayingRef.current) {
                    // 如果还在播放状态，说明是异常关闭
                    setTimeout(() => {
                        if (isPlayingRef.current) {
                            stopPlayback();
                        }
                    }, 2000);
                }
            };

        } catch (error) {
            console.error('TTS Playback Error:', error);
            alert('无法播放语音: ' + error.message);
            stopPlayback();
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
                className={`audio-player-btn ${loading ? 'loading' : ''} ${playing ? 'playing' : ''}`}
                onClick={handlePlay}
                disabled={loading}
                title={playing ? "停止播放" : "朗读全文"}
                style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: loading ? 'wait' : 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    color: playing ? '#007bff' : '#666',
                    transition: 'all 0.3s ease'
                }}
            >
                {loading ? (
                    <span className="spinner">↻</span>
                ) : playing ? (
                    <span>⏹</span>
                ) : (
                    <span>🔊</span>
                )}
            </button>
            {(loading || playing) && progress > 0 && (
                <div style={{
                    fontSize: '0.8rem',
                    color: '#999'
                }}>
                    {Math.round(progress)}%
                </div>
            )}
        </div>
    );
};

export default AudioPlayer;
