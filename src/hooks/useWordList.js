import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getWordsByCategory } from '../services/api';
import { getWordList, toggleWordInList, WORD_LIST_TYPES, SessionStorage, SESSION_KEYS } from '../services/storage';

/**
 * Hook for managing word list data and pagination
 */
export function useWordListPagination(category) {
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const wordsRef = useRef([]); // To access latest words in closures
    const PAGE_SIZE = 20;

    // Sync ref
    useEffect(() => {
        wordsRef.current = words;
    }, [words]);

    // Initial load
    useEffect(() => {
        let isMounted = true;
        const savedCount = parseInt(
            SessionStorage.get(SESSION_KEYS.WORD_LIST_LOADED_COUNT(category), '0'),
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
                    const savedScrollPos = SessionStorage.get(SESSION_KEYS.WORD_LIST_SCROLL_POS(category));
                    if (savedScrollPos) {
                        setTimeout(() => {
                            window.scrollTo(0, parseInt(savedScrollPos, 10));
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
            SessionStorage.set(
                SESSION_KEYS.WORD_LIST_LOADED_COUNT(category),
                words.length.toString()
            );
        }
    }, [words, category]);

    // Save scroll position setup
    useEffect(() => {
        const handleScroll = () => {
            SessionStorage.set(
                SESSION_KEYS.WORD_LIST_SCROLL_POS(category),
                window.scrollY.toString()
            );
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [category]);

    const saveScrollPosition = useCallback(() => {
        SessionStorage.set(
            SESSION_KEYS.WORD_LIST_SCROLL_POS(category),
            window.scrollY.toString()
        );
    }, [category]);

    return { words, loading, hasMore, loadMore, saveScrollPosition };
}

/**
 * Hook for managing view settings (meaning visibility)
 */
export function useWordListSettings(category) {
    const [showAllMeanings, setShowAllMeanings] = useState(() => {
        return SessionStorage.get(SESSION_KEYS.WORD_LIST_SHOW_ALL_MEANINGS(category), false);
    });

    const [meaningVisibility, setMeaningVisibility] = useState(() => {
        return SessionStorage.get(SESSION_KEYS.WORD_LIST_MEANING_VISIBILITY(category), {});
    });

    useEffect(() => {
        SessionStorage.set(
            SESSION_KEYS.WORD_LIST_SHOW_ALL_MEANINGS(category),
            showAllMeanings
        );
    }, [showAllMeanings, category]);

    useEffect(() => {
        SessionStorage.set(
            SESSION_KEYS.WORD_LIST_MEANING_VISIBILITY(category),
            meaningVisibility
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
        async function loadFavorites() {
            const list = await getWordList(WORD_LIST_TYPES.FAVORITE);
            const set = new Set();
            list.forEach((item) => {
                if (item && item.word && item.category) {
                    set.add(`${item.category}-${item.word}`);
                }
            });
            setFavoriteWords(set);
        }

        loadFavorites();
    }, []);

    const favoriteKeySet = useMemo(() => favoriteWords, [favoriteWords]);

    const toggleFavorite = useCallback(async (word) => {
        await toggleWordInList(WORD_LIST_TYPES.FAVORITE, word, category);

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
