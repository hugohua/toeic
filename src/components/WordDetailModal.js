import React from 'react';
import WordTitle from './WordTitle';
import PhraseCell from './PhraseCell';
import ExampleSentence from './ExampleSentence';
import ConfusingWordCell from './ConfusingWordCell';
import { formatKeyCollocations } from '../utils/text';
import '../pages/WordArticlePage.css';
import './WordDetailModal.css';

/**
 * 单词详情弹窗组件
 * @param {object} props
 * @param {object} props.wordDetail - 单词详情对象
 * @param {function} props.onClose - 关闭弹窗的回调函数
 */
function WordDetailModal({ wordDetail, onClose }) {
  if (!wordDetail) return null;

  const coreMeaning = wordDetail.coreMeaning || '暂无';
  const toeicSceneFocus = wordDetail.toeicSceneFocus || wordDetail.sceneFocus || '暂无';
  const keyCollocationsHtml = formatKeyCollocations(wordDetail.keyCollocations);

  const renderExampleSentences = () => {
    if (
      wordDetail.toeicExampleSentences &&
      Array.isArray(wordDetail.toeicExampleSentences) &&
      wordDetail.toeicExampleSentences.length > 0
    ) {
      return (
        <ol>
          {wordDetail.toeicExampleSentences.map((sent, index) => (
            <li key={index}>
              <ExampleSentence sentence={sent} />
            </li>
          ))}
        </ol>
      );
    } else {
      return <p className="word-detail-empty-text">暂无例句</p>;
    }
  };

  const renderConfusingWords = () => {
    if (
      wordDetail.confusingWordsComparison &&
      Array.isArray(wordDetail.confusingWordsComparison) &&
      wordDetail.confusingWordsComparison.length > 0
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
            {wordDetail.confusingWordsComparison.map((item, index) => (
              <tr key={index}>
                <td>
                  <ConfusingWordCell wordText={item.word} />
                </td>
                <td>{item.coreDifference}</td>
                <td>{item.toeicSceneFocus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (wordDetail.confusionDistinction) {
      // 如果存在 confusionDistinction 字符串，使用 dangerouslySetInnerHTML 作为后备
      return (
        <div dangerouslySetInnerHTML={{ __html: wordDetail.confusionDistinction }} />
      );
    } else {
      return <div>暂无</div>;
    }
  };

  return (
    <div className="word-detail-modal-content">
      <div className="word-detail-header">
        <div className="word-detail-title-wrapper">
          <WordTitle word={wordDetail.word} />
          <div className="word-detail-phonetic">{wordDetail.phonetic || '/ˈwɜːrd/'}</div>
        </div>
        <button className="word-detail-close" onClick={onClose}>×</button>
      </div>

      <div className="word-detail-body">
        <div className="word-detail-section">
          <h3 className="word-detail-section-title">核心释义</h3>
          <div
            className="word-detail-section-content"
            dangerouslySetInnerHTML={{ __html: coreMeaning }}
          />
        </div>

        {wordDetail.phrase && (
          <div className="word-detail-section">
            <h3 className="word-detail-section-title">短语短句</h3>
            <div className="word-detail-section-content">
              <PhraseCell phraseText={wordDetail.phrase} />
            </div>
          </div>
        )}

        <div className="word-detail-section">
          <h3 className="word-detail-section-title">TOEIC场景重点</h3>
          <div
            className="word-detail-section-content"
            dangerouslySetInnerHTML={{ __html: toeicSceneFocus }}
          />
        </div>

        <div className="word-detail-section">
          <h3 className="word-detail-section-title">关键搭配</h3>
          <div
            className="word-detail-section-content"
            dangerouslySetInnerHTML={{ __html: keyCollocationsHtml }}
          />
        </div>

        <div className="word-detail-section">
          <h3 className="word-detail-section-title">TOEIC例句</h3>
          <div className="word-detail-section-content">{renderExampleSentences()}</div>
        </div>

        {wordDetail.sceneAssociation && (
          <div className="word-detail-section">
            <h3 className="word-detail-section-title">场景联想</h3>
            <div
              className="word-detail-section-content"
              dangerouslySetInnerHTML={{ __html: wordDetail.sceneAssociation }}
            />
          </div>
        )}

        <div className="word-detail-section">
          <h3 className="word-detail-section-title">易混淆词区分</h3>
          <div className="word-detail-section-content">{renderConfusingWords()}</div>
        </div>
      </div>
    </div>
  );
}

export default WordDetailModal;

