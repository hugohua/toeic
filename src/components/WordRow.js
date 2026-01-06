import React, { memo } from 'react';
import { useSpeechConfig } from '../hooks/useSpeechConfig';
import { getFirstSlashContent } from '../utils/app';

// 单词行组件，包含发音、释义和收藏功能
const WordRow = memo(function WordRow({
    word,
    index,
    isFavorite,
    isMeaningVisible,
    onRowClick,
    onMeaningToggle,
    onToggleFavorite,
    getShortMeaning,
    onEtymologyClick,
}) {
    const { start } = useSpeechConfig(word.word || '');

    const handleWordClick = (e) => {
        e.stopPropagation();
        start();
    };

    const handleMeaningCellClick = (e) => {
        e.stopPropagation();
        // 点击释义时播放单词声音
        start();
        // 切换释义显示状态
        onMeaningToggle(index);
    };

    return (
        <tr className="word-list-row" onClick={() => onRowClick(index)}>
            <td className="col-word">
                <span
                    className={`word-list-text ${isFavorite ? 'word-favorite' : ''} word-list-clickable`}
                    onClick={handleWordClick}
                    title="点击播放发音"
                >
                    {word.word}
                    <span className="word-phonetic">
                        {getFirstSlashContent(word.phonetic)}
                    </span>
                </span>
            </td>
            <td
                className="col-meaning word-list-meaning-clickable"
                onClick={handleMeaningCellClick}
            >
                <span className="meaning-text">
                    {isMeaningVisible ? getShortMeaning(word) : '点击显示释义'}
                </span>
            </td>
            <td className="col-favorite">
                <div className="action-buttons">
                    <button
                        type="button"
                        className="action-btn etymology-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEtymologyClick(word.word);
                        }}
                        title="查看构词法"
                    >
                        <span className="iconfont icon-read"></span>
                    </button>
                    <button
                        type="button"
                        className={`action-btn list-favorite-btn ${isFavorite ? 'favorited' : ''}`}
                        onClick={(e) => onToggleFavorite(e, word.word)}
                        title={isFavorite ? '取消收藏' : '收藏单词'}
                    >
                        <span className="iconfont icon-star"></span>
                    </button>
                </div>
            </td>
        </tr>
    );
});

export default WordRow;
