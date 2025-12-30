import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getWordsByCategory } from '../utils/api';
import { getWordList, toggleWordInList, WORD_LIST_TYPES } from '../utils/storage';

/**
 * Hook for managing word list data and pagination
 */
export function useWordListPagination(category) {
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const wordsRef = useRef([]); // To access latest words in closures
    const PAGE_SIZE = 20;

    const getStorageKey = (key) => `wordList_${category}_${key}`;

    // Sync ref
    useEffect(() => {
        wordsRef.current = words;
    }, [words]);

    // Initial load
    useEffect(() => {
        let isMounted = true;
        const savedCount = parseInt(
            sessionStorage.getItem(getStorageKey('loadedCount')) || '0',
            10
        );
        // Recover state logic: load at least what was loaded before, or one page
        const initialLimit = savedCount > PAGE_SIZE ? savedCount : PAGE_SIZE;

        async function loadInitialWords() {
            setLoading(true);
            try {
                const categoryWords = await getWordsByCategory(category, initialLimit, 0);
                if (isMounted) {
                    setWords(categoryWords);
                    if (categoryWords.length < initialLimit) {
                        setHasMore(false);
                    }

                    // Restore scroll position
                    const savedScrollPos = sessionStorage.getItem(getStorageKey('scrollPos'));
                    if (savedScrollPos) {
                        setTimeout(() => {
                            window.scrollTo(0, parseInt(savedScrollPos));
                        }, 100);
                    }
                }
            } catch (error) {
                console.error('加载单词列表失败:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadInitialWords();

        return () => {
            isMounted = false;
        };
    }, [category]);

    // Load more
    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        const currentLength = wordsRef.current.length;

        try {
            const newWords = await getWordsByCategory(category, PAGE_SIZE, currentLength);

            if (newWords.length === 0) {
                setHasMore(false);
            } else {
                setWords((prev) => [...prev, ...newWords]);
                if (newWords.length < PAGE_SIZE) {
                    setHasMore(false);
                }
            }
        } catch (error) {
            console.error('加载更多单词失败:', error);
        } finally {
            setLoading(false);
        }
    }, [category, loading, hasMore]);

    // Persist loaded count
    useEffect(() => {
        if (words.length > 0) {
            sessionStorage.setItem(
                getStorageKey('loadedCount'),
                words.length.toString()
            );
        }
    }, [words, category]);

    // Save scroll position setup
    useEffect(() => {
        const handleScroll = () => {
            sessionStorage.setItem(
                getStorageKey('scrollPos'),
                window.scrollY.toString()
            );
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [category]);

    const saveScrollPosition = useCallback(() => {
        sessionStorage.setItem(
            getStorageKey('scrollPos'),
            window.scrollY.toString()
        );
    }, [category]);

    return { words, loading, hasMore, loadMore, saveScrollPosition };
}

/**
 * Hook for managing view settings (meaning visibility)
 */
export function useWordListSettings(category) {
    const getStorageKey = (key) => `wordList_${category}_${key}`;

    const [showAllMeanings, setShowAllMeanings] = useState(() => {
        const saved = sessionStorage.getItem(getStorageKey('showAllMeanings'));
        return saved ? JSON.parse(saved) : false;
    });

    const [meaningVisibility, setMeaningVisibility] = useState(() => {
        const saved = sessionStorage.getItem(getStorageKey('meaningVisibility'));
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        sessionStorage.setItem(
            getStorageKey('showAllMeanings'),
            JSON.stringify(showAllMeanings)
        );
    }, [showAllMeanings, category]);

    useEffect(() => {
        sessionStorage.setItem(
            getStorageKey('meaningVisibility'),
            JSON.stringify(meaningVisibility)
        );
    }, [meaningVisibility, category]);

    const toggleAllMeanings = useCallback(() => {
        setShowAllMeanings((prev) => !prev);
        setMeaningVisibility({});
    }, []);

    const toggleMeaning = useCallback((index) => {
        setMeaningVisibility((prev) => {
            const isVisible = Object.prototype.hasOwnProperty.call(prev, index)
                ? prev[index]
                : showAllMeanings;

            return {
                ...prev,
                [index]: !isVisible,
            };
        });
    }, [showAllMeanings]);

    const isMeaningVisible = useCallback((index) => {
        if (Object.prototype.hasOwnProperty.call(meaningVisibility, index)) {
            return meaningVisibility[index];
        }
        return showAllMeanings;
    }, [meaningVisibility, showAllMeanings]);

    return {
        showAllMeanings,
        toggleAllMeanings,
        toggleMeaning,
        isMeaningVisible,
    };
}

/**
 * Hook for favorite words management
 */
export function useFavoriteWords(category) {
    const [favoriteWords, setFavoriteWords] = useState(new Set());

    useEffect(() => {
        const list = getWordList(WORD_LIST_TYPES.FAVORITE);
        const set = new Set();
        list.forEach((item) => {
            if (item && item.word && item.category) {
                set.add(`${item.category}-${item.word}`);
            }
        });
        setFavoriteWords(set);
    }, []);

    const favoriteKeySet = useMemo(() => favoriteWords, [favoriteWords]);

    const toggleFavorite = useCallback((word) => {
        toggleWordInList(WORD_LIST_TYPES.FAVORITE, word, category);

        const key = `${category}-${word}`;
        setFavoriteWords((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    }, [category]);

    const isFavorited = useCallback((word) => {
        return favoriteKeySet.has(`${category}-${word}`);
    }, [favoriteKeySet, category]);

    return {
        isFavorited,
        toggleFavorite
    };
}
