import React from 'react';
import ExampleSentence from './ExampleSentence';

function ExampleSentences({ sentences, cssPrefix = 'word-detail' }) {
    if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
        return <span className="word-detail-empty-text">暂无例句</span>;
    }

    return (
        <div className="example-sentences-list">
            {sentences.map((sent, index) => (
                <ExampleSentence
                    key={index}
                    sentence={sent}
                    className={`${cssPrefix}-example-sentence`}
                />
            ))}
        </div>
    );
}

export default ExampleSentences;
