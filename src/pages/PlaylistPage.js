import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlaylistAudio, PLAY_MODES } from '../hooks/usePlaylistAudio';
import { getWordsByCategory } from '../services/api';
import Header from '../components/Header';
import Loading from '../components/Loading';
import { extractEnglishText } from '../utils/text';
import './PlaylistPage.css';

const PlaylistPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Derive playlistId from location state
    const playlistId = location.state?.category
        ? `category_${location.state.category}`
        : (location.state?.type ? `type_${location.state.type}` : null);

    const {
        queue,
        setQueue,
        currentWord,
        isPlaying,
        togglePlay,
        settings,
        setSettings,
        skipNext,
        skipPrev,
        audioPlayer
    } = usePlaylistAudio(playlistId);

    const [loading, setLoading] = React.useState(false);

    // Initialize queue from navigation state
    useEffect(() => {
        if (location.state && location.state.list) {
            setQueue(location.state.list);
        } else if (location.state && location.state.category) {
            setLoading(true);
            getWordsByCategory(location.state.category)
                .then(words => {
                    setQueue(words);
                })
                .catch(err => console.error('Failed to load playlist:', err))
                .finally(() => setLoading(false));
        }
    }, [location.state, setQueue]);

    const handleModeChange = (e) => {
        setSettings(prev => ({ ...prev, mode: e.target.value }));
    };

    const handleSpeedChange = (e) => {
        setSettings(prev => ({ ...prev, speed: parseFloat(e.target.value) }));
    };

    const handleRepeatChange = (e) => {
        setSettings(prev => ({ ...prev, repeatCount: parseInt(e.target.value, 10) }));
    };

    const handleIntervalChange = (e) => {
        setSettings(prev => ({ ...prev, interval: parseInt(e.target.value, 10) }));
    };

    if (loading) {
        return <Loading />;
    }

    if (!queue || queue.length === 0) {
        return (
            <div className="playlist-container">
                <Header title="随身听" showBack />
                <div className="empty-state">
                    <p>没有播放列表</p>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>返回</button>
                </div>
            </div>
        );
    }

    return (
        <div className="playlist-container">
            <Header title="随身听" showBack />

            <div className="playlist-content">
                {currentWord ? (
                    <div className="playlist-word-card">
                        <div className="playlist-word">{currentWord.word}</div>
                        <div className="playlist-phonetic">/{currentWord.phonetic}/</div>

                        {(settings.mode === PLAY_MODES.WORD_DEFINITION || settings.mode === PLAY_MODES.ALL) && (
                            <div className="playlist-definition">
                                {currentWord.coreMeaning || currentWord.definition}
                            </div>
                        )}

                        {(settings.mode === PLAY_MODES.WORD_SENTENCE || settings.mode === PLAY_MODES.ALL) && currentWord.toeicExampleSentences && currentWord.toeicExampleSentences.length > 0 && (
                            <div className="playlist-sentence">
                                {(() => {
                                    const rawSentence = currentWord.toeicExampleSentences[0];
                                    const { english, remaining } = typeof rawSentence === 'string'
                                        ? extractEnglishText(rawSentence)
                                        : { english: rawSentence.english || '', remaining: rawSentence.chinese || '' };

                                    return (
                                        <>
                                            <span className="playlist-english">{english}</span>
                                            <span className="playlist-chinese">{remaining}</span>
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="empty-state">准备播放...</div>
                )}
                {audioPlayer.loading && (
                    <div className="playlist-audio-loading">
                        <div className="playlist-audio-loading-spinner"></div>
                        <span>加载音频...</span>
                    </div>
                )}
            </div>

            <div className="playlist-controls-area">
                {/* Progress Bar (Visual only for now, maybe track current word / total words) */}
                {/* Or track audio progress if possible, but strict audio progress is hard with queue logic. */}
                {/* Let's show Queue progress */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#bdc3c7', marginBottom: '0.5rem' }}>
                    <span>{queue.indexOf(currentWord) + 1} / {queue.length}</span>
                </div>
                <div className="playlist-progress-bar">
                    <div
                        className="playlist-progress-fill"
                        style={{ width: `${((queue.indexOf(currentWord) + 1) / queue.length) * 100}%` }}
                    ></div>
                </div>

                <div className="playlist-main-controls">
                    <button className="control-btn" onClick={skipPrev}>⏮</button>
                    <button className="control-btn play-btn" onClick={togglePlay}>
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button className="control-btn" onClick={skipNext}>⏭</button>
                </div>

                <div className="playlist-settings-bar">
                    <div className="setting-item">
                        <label>模式</label>
                        <select className="setting-select" value={settings.mode} onChange={handleModeChange}>
                            <option value={PLAY_MODES.ALL}>全部</option>
                            <option value={PLAY_MODES.WORD_DEFINITION}>单词+释义</option>
                            <option value={PLAY_MODES.WORD_SENTENCE}>单词+例句</option>
                            <option value={PLAY_MODES.WORD_ONLY}>仅单词</option>
                        </select>
                    </div>
                    <div className="setting-item">
                        <label>倍速</label>
                        <select className="setting-select" value={settings.speed} onChange={handleSpeedChange}>
                            <option value="0.8">0.8x</option>
                            <option value="1.0">1.0x</option>
                            <option value="1.2">1.2x</option>
                            <option value="1.5">1.5x</option>
                        </select>
                    </div>
                    <div className="setting-item">
                        <label>重复</label>
                        <select className="setting-select" value={settings.repeatCount} onChange={handleRepeatChange}>
                            <option value="1">1次</option>
                            <option value="2">2次</option>
                            <option value="3">3次</option>
                        </select>
                    </div>
                    <div className="setting-item">
                        <label>间隔</label>
                        <select className="setting-select" value={settings.interval} onChange={handleIntervalChange}>
                            <option value="1000">1s</option>
                            <option value="2000">2s</option>
                            <option value="3000">3s</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaylistPage;
