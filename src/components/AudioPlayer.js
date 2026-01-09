import React, { useState, useEffect } from 'react';
import './AudioPlayer.css';
import { useAliyunAudio } from '../hooks/useAliyunAudio';
import { AUDIO_CONFIG } from '../utils/audioConfig';

/**
 * 实时语音播放组件（增强版）
 * 逻辑已迁移至 useAliyunAudio Hook
 */
function AudioPlayer({
    text,
    voice = AUDIO_CONFIG.DEFAULT_VOICE,
    language = AUDIO_CONFIG.DEFAULT_LANGUAGE,
    className = '',
    showAdvanced = true
}) {
    // UI 状态
    const [selectedVoice, setSelectedVoice] = useState(voice);
    const [playbackRate, setPlaybackRate] = useState(1.0);

    // 引入自定义 Hook
    const {
        play,
        stop,
        playing,
        loading,  // 添加 loading 状态
        error,
        progress,
        duration,
        currentTime
    } = useAliyunAudio();

    // 可用的音色列表
    const voices = [
        { value: 'Cherry', label: 'Cherry (女声)', gender: '女' },
        { value: 'Elias', label: 'Elias (女声)', gender: '女' },
        { value: 'Ryan', label: 'Ryan (男声)', gender: '男' },
        { value: 'Stella', label: 'Stella (女声)', gender: '女' },
        { value: 'Emily', label: 'Emily (女声)', gender: '女' },
        { value: 'Luna', label: 'Luna (女声)', gender: '女' },
    ];

    // 播放速度选项
    const playbackRates = [
        { value: 0.5, label: '0.5x' },
        { value: 0.75, label: '0.75x' },
        { value: 1.0, label: '1.0x' },
        { value: 1.25, label: '1.25x' },
        { value: 1.5, label: '1.5x' },
        { value: 2.0, label: '2.0x' },
    ];

    /**
     * 处理播放/停止
     */
    const handleTogglePlay = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (playing) {
            stop();
        } else {
            play(text, selectedVoice, language, playbackRate);
        }
    };

    /**
     * 格式化时间显示
     */
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 当外部 props 改变时更新内部音色状态
    useEffect(() => {
        setSelectedVoice(voice);
    }, [voice]);

    return (
        <div className={`audio-player ${showAdvanced ? 'audio-player-advanced' : ''} ${className}`}>
            <div className="audio-player-controls">
                {/* 播放/停止按钮 */}
                <button
                    type="button"
                    className={`audio-player-button ${playing ? 'playing' : ''} ${loading ? 'loading' : ''}`}
                    onClick={handleTogglePlay}
                    title={loading ? '加载中...' : (playing ? '停止播放' : '播放语音')}
                    disabled={!text || !text.trim() || loading}
                >
                    {loading ? (
                        <span className="audio-player-spinner"></span>
                    ) : playing ? (
                        <span className="iconfont icon-stop"></span>
                    ) : (
                        <span className="iconfont icon-sound"></span>
                    )}
                    <span className="audio-player-text">
                        {loading ? '加载中' : (playing ? '停止' : '播放')}
                    </span>
                </button>

                {/* 高级控制 */}
                {showAdvanced && (
                    <>
                        {/* 音色选择 */}
                        <select
                            className="audio-player-select"
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            disabled={playing}
                            title="选择音色"
                        >
                            {voices.map(v => (
                                <option key={v.value} value={v.value}>
                                    {v.label}
                                </option>
                            ))}
                        </select>

                        {/* 播放速度 */}
                        <select
                            className="audio-player-select audio-player-rate"
                            value={playbackRate}
                            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                            disabled={playing}
                            title="播放速度"
                        >
                            {playbackRates.map(r => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </>
                )}
            </div>

            {/* 进度条 */}
            {showAdvanced && playing && (
                <div className="audio-player-progress-container">
                    <div className="audio-player-progress-bar">
                        <div
                            className="audio-player-progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="audio-player-time">
                        <span>{formatTime(currentTime)}</span>
                        {duration > 0 && <span> / {formatTime(duration)}</span>}
                    </div>
                </div>
            )}

            {/* 错误提示 */}
            {error && (
                <div className="audio-player-error" title={error}>
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}

export default AudioPlayer;
