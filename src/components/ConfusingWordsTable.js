import React from 'react';
import ConfusingWordCell from './ConfusingWordCell';

function ConfusingWordsTable({ word, cssPrefix = 'word-detail' }) {
    if (
        word.confusingWordsComparison &&
        Array.isArray(word.confusingWordsComparison) &&
        word.confusingWordsComparison.length > 0
    ) {
        return (
            <table className="confusing-words-table">
                <thead>
                    <tr>
                        <th>单词</th>
                        <th>核心区别</th>
                        <th>TOEIC场景重点</th>
                    </tr>
                </thead>
                <tbody>
                    {word.confusingWordsComparison.map((item, index) => (
                        <tr key={index}>
                            <td>
                                <ConfusingWordCell
                                    wordText={item.word}
                                    className={`${cssPrefix}-clickable`}
                                />
                            </td>
                            <td>{item.coreDifference}</td>
                            <td>{item.toeicSceneFocus}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    } else if (word.confusionDistinction) {
        // 如果存在 confusionDistinction 字符串，使用 dangerouslySetInnerHTML 作为后备
        return (
            <div dangerouslySetInnerHTML={{ __html: word.confusionDistinction }} />
        );
    } else {
        return <div>暂无</div>;
    }
}

export default ConfusingWordsTable;
