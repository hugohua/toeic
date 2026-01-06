import React from 'react';
import ExampleSentence from './ExampleSentence';

function ExampleSentences({ sentences, cssPrefix = 'word-detail' }) {
    if (sentences && Array.isArray(sentences) && sentences.length > 0) {
        return (
            <ol>
                {sentences.map((sent, index) => (
                    <li key={index}>
                        <ExampleSentence
                            sentence={sent}
                            className={`${cssPrefix}-example-sentence`}
                        />
                    </li>
                ))}
            </ol>
        );
    } else {
        return <p className={`${cssPrefix}-empty-text`}>暂无例句</p>;
    }
}

export default ExampleSentences;
