
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BottomSheet from './BottomSheet';
import '../styles/Markdown.css';
import { getEtymology } from '../utils/api';
import Popup from './Popup';

/**
 * EtymologyBottomSheet 组件 - 显示构词法内容
 * @param {object} props
 * @param {boolean} props.isOpen - 是否打开
 * @param {function} props.onClose - 关闭回调
 * @param {string} props.word - 目标单词
 */
function EtymologyBottomSheet({ isOpen, onClose, word }) {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        if (isOpen && word) {
            fetchEtymology(word);
        } else {
            // 关闭时清理状态
            setContent('');
            setError(null);
            setIsLoading(false);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        }
    }, [isOpen, word]);

    const fetchEtymology = async (targetWord) => {
        setIsLoading(true);
        setContent('');
        setError(null);

        // 如果已有正在进行的请求，先中止
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const onChunk = (chunk) => {
            setContent((prev) => prev + chunk);
        };

        const onError = (err) => {
            if (err.name !== 'AbortError') {
                console.error('获取构词法错误:', err);
                setError(err.message || '网络请求失败');
                setIsLoading(false);
            }
        };

        const onComplete = (meta) => {
            setIsLoading(false);
            abortControllerRef.current = null;

            // 如果是流式生成的（isStream: true），说明进行了数据库保存，显示提示
            if (meta?.isStream) {
                Popup.show('构词法解析已生成并保存到数据库', 2000);
            }
        };

        try {
            await getEtymology(targetWord, onChunk, onError, onComplete, abortController.signal);
        } catch (err) {
            // 这里主要处理同步错误，流式错误由 onError 回调处理
            if (err.name !== 'AbortError') {
                console.error('调用构词法API错误:', err);
                // 只有当没有显示错误时才设置
                if (!error) {
                    setError(err.message || '调用API失败');
                    setIsLoading(false);
                }
            }
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose}>
            <div className="text-selection-sheet">
                <div className="text-selection-header">
                    <h3 className="text-selection-title">
                        构词法: {word}
                    </h3>
                    <div className="text-selection-header-actions">
                        <button className="text-selection-close" onClick={onClose}>×</button>
                    </div>
                </div>
                <div className="text-selection-content">
                    {error ? (
                        <div className="text-selection-error">{error}</div>
                    ) : content ? (
                        <div className="text-selection-content-text markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                        </div>
                    ) : isLoading ? (
                        <div className="text-selection-loading">
                            <div className="loading-spinner"></div>
                            正在生成构词法解析...
                        </div>
                    ) : (
                        <div className="text-selection-empty">暂无内容</div>
                    )}
                </div>
            </div>
        </BottomSheet>
    );
}

export default EtymologyBottomSheet;
