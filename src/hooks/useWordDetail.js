import { useState, useEffect, useRef } from 'react';
import { getWordByWord, translate } from '../utils/api';
import { cleanWordText } from '../utils/text';

/**
 * 单词详情和翻译的 Hook
 * @param {object} options - 配置选项
 * @param {object} options.article - 文章对象（可选，用于 ArticleDetailPage）
 * @param {boolean} options.enableWordClick - 是否启用单词点击监听（默认 true）
 * @returns {object} 返回状态和处理函数
 */
export function useWordDetail({ article = null, enableWordClick = true } = {}) {
    const [selectedWord, setSelectedWord] = useState(null);
    const [wordDetail, setWordDetail] = useState(null);
    const [isLoadingWordDetail, setIsLoadingWordDetail] = useState(false);
    const [translationContent, setTranslationContent] = useState('');
    const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
    const [error, setError] = useState('');
    const articleRef = useRef(null);
    const abortControllerRef = useRef(null);

    // 调用翻译的辅助函数
    const callTranslate = (cleanWord) => {
        // 如果已有正在进行的请求，先中止
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // 创建新的 AbortController
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsLoadingWordDetail(false);
        setIsLoadingTranslation(true);
        setTranslationContent('');
        setError('');

        translate(
            cleanWord,
            // onChunk: 接收每个内容块，使用函数式更新确保流式输出
            (chunk) => {
                if (!abortController.signal.aborted) {
                    setTranslationContent((prev) => prev + chunk);
                }
            },
            // onError: 错误处理
            (error) => {
                if (!abortController.signal.aborted) {
                    console.error('翻译错误:', error);
                    setTranslationContent(`翻译失败: ${error.message}`);
                    setIsLoadingTranslation(false);
                }
            },
            // onComplete: 完成回调
            () => {
                if (!abortController.signal.aborted) {
                    setIsLoadingTranslation(false);
                }
                abortControllerRef.current = null;
            },
            abortController.signal
        );
    };

    // 处理单词点击事件（ArticleDetailPage 版本：直接查找）
    const handleWordClickWithCategories = async (wordText) => {
        if (!wordText || !article) return;

        const cleanWord = cleanWordText(wordText);
        if (!cleanWord) return;

        setSelectedWord(cleanWord);
        setIsLoadingWordDetail(true);
        setWordDetail(null);
        setTranslationContent('');
        setError('');

        try {
            // 直接根据单词获取详情，不依赖分类
            const detail = await getWordByWord(cleanWord);
            if (detail) {
                setWordDetail(detail);
                setIsLoadingWordDetail(false);
            } else {
                // 如果没找到单词详情，调用翻译
                callTranslate(cleanWord);
            }
        } catch (err) {
            console.error('获取单词详情失败:', err);
            // 检查是否是404错误
            if (err.message && err.message.includes('404')) {
                // 404错误时调用翻译
                callTranslate(cleanWord);
            } else {
                setError('查找单词详情失败: ' + err.message);
                setIsLoadingWordDetail(false);
            }
        }
    };

    // 处理单词点击事件（WordArticlePage 版本：直接查找）
    const handleWordClickSimple = async (wordText) => {
        if (!wordText) return;

        const cleanWord = cleanWordText(wordText);
        if (!cleanWord) return;

        setSelectedWord(cleanWord);
        setIsLoadingWordDetail(true);
        setWordDetail(null);
        setTranslationContent('');
        setError('');

        try {
            // 直接根据单词获取详情，不依赖分类
            const detail = await getWordByWord(cleanWord);
            if (detail) {
                setWordDetail(detail);
                setIsLoadingWordDetail(false);
            } else {
                // 如果没找到单词详情，调用翻译
                callTranslate(cleanWord);
            }
        } catch (err) {
            console.error('获取单词详情失败:', err);
            // 检查是否是404错误
            if (err.message && err.message.includes('404')) {
                // 404错误时调用翻译
                callTranslate(cleanWord);
            } else {
                setError('查找单词详情失败: ' + err.message);
                setIsLoadingWordDetail(false);
            }
        }
    };

    // 根据是否有 article 选择不同的处理函数
    // 使用 useRef 来存储最新的处理函数，避免 useEffect 依赖问题
    const handleWordClickRef = useRef(null);
    handleWordClickRef.current = article ? handleWordClickWithCategories : handleWordClickSimple;

    // 添加点击事件监听
    useEffect(() => {
        if (!enableWordClick || !articleRef.current) return;

        const handleClick = (e) => {
            const wordElement = e.target.closest('.word-highlight');
            if (wordElement) {
                const wordText = wordElement.getAttribute('data-word');
                if (wordText && handleWordClickRef.current) {
                    handleWordClickRef.current(wordText);
                }
            }
        };

        const articleElement = articleRef.current;
        articleElement.addEventListener('click', handleClick);

        return () => {
            articleElement.removeEventListener('click', handleClick);
        };
    }, [enableWordClick, article]);

    // 暴露处理函数供外部调用
    const handleWordClick = (wordText) => {
        if (handleWordClickRef.current) {
            handleWordClickRef.current(wordText);
        }
    };

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            // 组件卸载时中止正在进行的请求
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    // 关闭弹窗
    const handleCloseModal = () => {
        // 中止正在进行的请求
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setSelectedWord(null);
        setWordDetail(null);
        setTranslationContent('');
        setError('');
        setIsLoadingTranslation(false);
    };

    // 判断弹窗是否打开
    const isModalOpen = selectedWord || wordDetail || translationContent || isLoadingTranslation;

    return {
        // 状态
        selectedWord,
        wordDetail,
        isLoadingWordDetail,
        translationContent,
        isLoadingTranslation,
        error,
        articleRef,
        isModalOpen,
        // 方法
        handleWordClick,
        handleCloseModal,
        setError,
    };
}
