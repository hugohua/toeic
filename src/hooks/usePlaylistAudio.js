import { useState, useEffect, useRef, useCallback } from 'react';
import { useAliyunAudio } from './useAliyunAudio';
import { getWordByWord } from '../services/api';
import { AUDIO_CONFIG } from '../utils/audioConfig';
import { extractEnglishText } from '../utils/text';

export const PLAY_MODES = {
    WORD_ONLY: 'word_only',
    WORD_DEFINITION: 'word_definition',
    WORD_SENTENCE: 'word_sentence',
    ALL: 'all',
};

const PROGRESS_STORAGE_PREFIX = 'tuoye_playlist_progress_';

export const usePlaylistAudio = (playlistId = null) => {
    const audioPlayer = useAliyunAudio();
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [settings, setSettings] = useState({
        mode: PLAY_MODES.ALL,
        repeatCount: 1, // Number of times to repeat the whole set for a word
        interval: 1000, // Interval between items in ms
        speed: 1.0,
    });

    // Playback state within a single item (word -> definition -> sentence)
    const [subIndex, setSubIndex] = useState(0); // 0: word, 1: definition, 2: sentence
    const [repeatCounter, setRepeatCounter] = useState(0);

    const timerRef = useRef(null);
    const wakeLockRef = useRef(null);

    // Load saved progress when queue is set
    useEffect(() => {
        if (queue.length > 0 && playlistId) {
            try {
                const savedProgress = localStorage.getItem(PROGRESS_STORAGE_PREFIX + playlistId);
                if (savedProgress) {
                    const { index } = JSON.parse(savedProgress);
                    if (typeof index === 'number' && index >= 0 && index < queue.length) {
                        console.log(`[Playlist] Restoring progress for ${playlistId}: index ${index}`);
                        setCurrentIndex(index);
                        return;
                    }
                }
            } catch (e) {
                console.warn('[Playlist] Failed to load progress:', e);
            }
            // Default to 0 if no valid save found
            if (currentIndex === -1) setCurrentIndex(0);
        } else if (queue.length > 0 && currentIndex === -1) {
            setCurrentIndex(0);
        }
    }, [queue, playlistId]);

    // Save progress when index changes
    useEffect(() => {
        if (playlistId && currentIndex >= 0) {
            try {
                localStorage.setItem(PROGRESS_STORAGE_PREFIX + playlistId, JSON.stringify({
                    index: currentIndex,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn('[Playlist] Failed to save progress:', e);
            }
        }
    }, [currentIndex, playlistId]);

    // Request Wake Lock
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                wakeLockRef.current.addEventListener('release', () => {
                    console.log('Wake Lock released');
                });
            }
        } catch (err) {
            console.warn('Wake Lock failed:', err);
        }
    };

    // Release Wake Lock
    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                console.warn('Wake Lock release failed:', err);
            }
        }
    };

    const playCurrentItem = useCallback(async () => {
        if (currentIndex < 0 || currentIndex >= queue.length) {
            setIsPlaying(false);
            return;
        }

        const item = queue[currentIndex];
        // console.log('Playing item:', item.word, 'SubIndex:', subIndex, 'Repeat:', repeatCounter);

        let textToPlay = '';
        let voice = 'Elias'; // Default English voice
        let language = 'English';

        // Determine what to play based on mode and subIndex
        // Sequence: Word (0) -> Definition (1) -> Sentence (2)
        // Modes filter which steps are active.

        // We need to map logical steps to actual subIndex 0, 1, 2
        // But simplified:
        // 0: Word
        // 1: Definition (Chinese)
        // 2: Sentence (English)

        // We check if current subIndex is valid for current mode.
        // If not, we skip to next valid subIndex or next repeat/word.

        if (subIndex === 0) {
            textToPlay = item.word;
            voice = AUDIO_CONFIG.DEFAULT_VOICE; // 'Elias'
            language = AUDIO_CONFIG.DEFAULT_LANGUAGE; // 'English'
        } else if (subIndex === 1) {
            // Definition is usually Chinese
            textToPlay = item.coreMeaning || item.definition || '';
            voice = AUDIO_CONFIG.CHINESE_VOICE; // 'ZhiXia'
            language = AUDIO_CONFIG.CHINESE_LANGUAGE; // 'Chinese'
        } else if (subIndex === 2) {
            // Example sentence
            // The sentence might be a string with mixed English and Chinese, needing extraction
            // Or it could be an object if standardized elsewhere, but we assume raw string from API/cache
            const rawSentence = item.toeicExampleSentences?.[0] || item.example || '';
            let sentenceToPlay = rawSentence;

            if (typeof rawSentence === 'string') {
                const { english } = extractEnglishText(rawSentence);
                sentenceToPlay = english;
            } else if (rawSentence.english) {
                // In case it IS an object
                sentenceToPlay = rawSentence.english;
            }

            textToPlay = sentenceToPlay;
            voice = AUDIO_CONFIG.DEFAULT_VOICE;
            language = AUDIO_CONFIG.DEFAULT_LANGUAGE;
        } else if (subIndex === 3) {
            // Example sentence (Chinese / Remaining)
            const rawSentence = item.toeicExampleSentences?.[0] || item.example || '';
            let sentenceToPlay = '';

            if (typeof rawSentence === 'string') {
                const { remaining } = extractEnglishText(rawSentence);
                // Remove parentheses for TTS to ensure it's read aloud
                sentenceToPlay = remaining.replace(/[（()）]/g, '').trim();
            } else if (rawSentence.chinese) {
                sentenceToPlay = rawSentence.chinese;
            }

            textToPlay = sentenceToPlay;
            voice = AUDIO_CONFIG.CHINESE_VOICE;
            language = AUDIO_CONFIG.CHINESE_LANGUAGE;
        }

        console.log(`[Playlist] Play request: subIndex=${subIndex} text="${textToPlay ? textToPlay.substring(0, 20) + '...' : ''}" voice=${voice}`);

        if (!textToPlay) {
            // Skip empty content
            console.log('[Playlist] Skipping empty content for subIndex:', subIndex);
            handleNextStep();
            return;
        }

        // console.log('Sending play command:', textToPlay);
        await audioPlayer.play(textToPlay, voice, language, settings.speed);

    }, [currentIndex, queue, subIndex, settings.speed, audioPlayer.play]); // Added audioPlayer.play to deps

    // Calculate next step (SubIndex -> Repeat -> Next Word)
    const handleNextStep = useCallback(() => {
        // console.log('Handling next step. Current Sub:', subIndex, 'Mode:', settings.mode);
        let nextSub = subIndex + 1;

        // Check if nextSub is valid for mode
        const isValidSub = (sub) => {
            if (sub === 0) return true; // Always play word
            if (sub === 1) return settings.mode === PLAY_MODES.WORD_DEFINITION || settings.mode === PLAY_MODES.ALL;
            if (sub === 2) return settings.mode === PLAY_MODES.WORD_SENTENCE || settings.mode === PLAY_MODES.ALL;
            if (sub === 3) return settings.mode === PLAY_MODES.WORD_SENTENCE || settings.mode === PLAY_MODES.ALL;
            return false;
        };

        // Find next valid subIndex or finish word
        while (nextSub <= 3 && !isValidSub(nextSub)) {
            nextSub++;
        }

        if (nextSub <= 3) {
            // Move to next part of same word
            setSubIndex(nextSub);
        } else {
            // Finished word cycle
            // Check repeat
            if (repeatCounter < settings.repeatCount - 1) {
                setRepeatCounter(prev => prev + 1);
                setSubIndex(0);
            } else {
                // Next word
                if (currentIndex < queue.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                    setSubIndex(0);
                    setRepeatCounter(0);
                } else {
                    // End of queue
                    setIsPlaying(false);
                    setCurrentIndex(0); // Reset to start
                    setSubIndex(0);
                    setRepeatCounter(0);
                }
            }
        }
    }, [subIndex, settings.mode, settings.repeatCount, repeatCounter, currentIndex, queue.length]);

    // Watch audio player status to trigger next
    useEffect(() => {
        if (isPlaying && !audioPlayer.playing && !audioPlayer.loading && !timerRef.current) {
            // Audio finished. Wait interval then next.
            // We need a stable way to detect "just finished".
            // Using a ref to track if we were just playing helps, but `audioPlayer.playing` is reliable enough if we manage the timer.

            // However, `audioPlayer.playing` is initially false. We need to know if we *started* playing.
            // The `playCurrentItem` sets audioPlayer.playing to true (async).
            // Let's rely on a "waiting for finish" flag or similar? 
            // Or simply: if isPlaying is true, and audioPlayer is idle, we should schedule next.
            // EXCEPT: when we first start `isPlaying`, audioPlayer is false too.

            // Better approach: `playCurrentItem` is triggered by effect when `currentIndex/subIndex` changes.
            // When audio finishes, we schedule `handleNextStep`.
        }
    }, [audioPlayer.playing, isPlaying]);


    // Effect to trigger play when index/subIndex changes
    useEffect(() => {
        if (isPlaying && queue.length > 0) {
            // Check if we need to fetch details for the current word
            const currentItem = queue[currentIndex];
            if (currentItem && (!currentItem.toeicExampleSentences || currentItem.toeicExampleSentences.length === 0)) {
                // Determine if we should pause playback while fetching? 
                // Actually, if we are at subIndex 0 (Word), we can play the word while fetching.
                // If we are at subIndex 2 (Sentence) and data is missing, handleNextStep will skip it.
                // So best to fetch as soon as we hit the index.

                // Avoid repeated fetches
                if (!currentItem._isFetching) {
                    // Mark as fetching in a local way or just fire and forget (queue update will trigger re-render)
                    // Using a local dirty flag in queue is tricky.
                    // Let's use getWordByWord.

                    // We only fetch if we intend to play sentences
                    if (settings.mode === PLAY_MODES.WORD_SENTENCE || settings.mode === PLAY_MODES.ALL) {
                        // console.log('Fetching full details for:', currentItem.word);
                        getWordByWord(currentItem.word).then(fullData => {
                            if (fullData) {
                                setQueue(prev => {
                                    const newQueue = [...prev];
                                    // Only update if it's still the same word at this index (or find by word)
                                    // Finding by index is safer for queue stability
                                    if (newQueue[currentIndex] && newQueue[currentIndex].word === fullData.word) {
                                        newQueue[currentIndex] = { ...newQueue[currentIndex], ...fullData, _isFetching: true };
                                        return newQueue;
                                    }
                                    return prev;
                                });
                            }
                        }).catch(err => console.warn('Fetch detail failed', err));
                    }
                }
            }

            // If audioPlayer is already playing, we shouldn't trigger? 
            // No, playCurrentItem calling `play` handles stopping previous.

            // We only want to play if we are NOT waiting for interval.
            if (timerRef.current) return;

            playCurrentItem();
        }
    }, [currentIndex, subIndex, repeatCounter, isPlaying, queue, playCurrentItem, settings.mode]); // Depend on state that defines "what to play"


    // The missing link: How to detect "audio finished" to update state?
    // `useAliyunAudio` doesn't provide onEnded.
    // We can watch `audioPlayer.playing`.
    // When it goes true -> false:
    const wasPlayingRef = useRef(false);
    useEffect(() => {
        if (audioPlayer.playing) {
            wasPlayingRef.current = true;
        } else if (wasPlayingRef.current) {
            // Just stopped playing
            wasPlayingRef.current = false;
            if (isPlaying) {
                // Schedule next
                timerRef.current = setTimeout(() => {
                    timerRef.current = null;
                    handleNextStep();
                }, settings.interval);
            }
        }
    }, [audioPlayer.playing, isPlaying, settings.interval, handleNextStep]);

    // Wake Lock management
    useEffect(() => {
        if (isPlaying) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }
        return () => releaseWakeLock();
    }, [isPlaying]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const togglePlay = () => {
        if (queue.length === 0) return;
        if (!isPlaying) {
            // Start
            if (currentIndex === -1) {
                setCurrentIndex(0);
                setSubIndex(0);
                setRepeatCounter(0);
            }
            setIsPlaying(true);
        } else {
            // Pause
            setIsPlaying(false);
            audioPlayer.stop();
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const skipNext = () => {
        if (currentIndex < queue.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSubIndex(0);
            setRepeatCounter(0);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            // If paused, just move index. If playing, effect will trigger play.
        }
    };

    const skipPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setSubIndex(0);
            setRepeatCounter(0);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    return {
        queue,
        setQueue,
        currentIndex,
        currentWord: queue[currentIndex],
        isPlaying,
        togglePlay,
        settings,
        setSettings,
        skipNext,
        skipPrev,
        audioPlayer
    };
};
