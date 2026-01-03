import React from 'react';
import PhraseCell from './PhraseCell';
import ExampleSentence from './ExampleSentence';
import ConfusingWordCell from './ConfusingWordCell';
import EtymologyBottomSheet from './EtymologyBottomSheet';
import { formatKeyCollocations } from '../utils/text';

/**
 * WordDetailContent - 公共的单词详情展示组件
 * @param {object} props
 * @param {object} props.word - 单词对象
 * @param {string} props.cssPrefix - CSS 类名前缀，用于区分不同页面的样式（如 'word-detail' 或 'word-browse'）
 * @param {function} props.onPlaySound - 播放发音的回调函数
 * @param {boolean} props.isFavorite - 是否已收藏
 * @param {function} props.onToggleFavorite - 切换收藏状态的回调函数
 * @param {number} props.progressCurrent - 当前进度（当前索引+1）
 * @param {number} props.progressTotal - 总进度（总数）
 * @param {React.RefObject} props.contentRef - 内容区域的 ref（用于 TextSelection 等）
 * @param {string} props.mode - 展示模式：'page' 页面模式（默认）或 'modal' 弹窗模式
 * @param {function} props.onClose - 关闭回调（仅 modal 模式使用）
 * @param {boolean} props.showEtymologyButton - 是否显示构词法按钮（默认 true）
 * @param {boolean} props.showFavoriteButton - 是否显示收藏按钮（默认 true）
 * @param {boolean} props.showProgress - 是否显示进度信息（默认 true）
 */
function WordDetailContent({
  word,
  cssPrefix = 'word-detail',
  onPlaySound,
  isFavorite = false,
  onToggleFavorite,
  progressCurrent,
  progressTotal,
  contentRef,
  mode = 'page',
  onClose,
  showEtymologyButton = true,
  showFavoriteButton = true,
  showProgress = true,
}) {
  const [showEtymology, setShowEtymology] = React.useState(false);

  if (!word) {
    return null;
  }

  const coreMeaning =
    word.coreMeaning ||
    (word.partOfSpeech ? `${word.partOfSpeech} ${word.coreMeaning}` : '暂无');
  const toeicSceneFocus = word.toeicSceneFocus || word.sceneFocus || '暂无';
  const keyCollocationsHtml = formatKeyCollocations(
    word.keyCollocations || word.usageCollocation
  );

  // 渲染TOEIC例句组件
  const renderExampleSentences = () => {
    if (
      word.toeicExampleSentences &&
      Array.isArray(word.toeicExampleSentences) &&
      word.toeicExampleSentences.length > 0
    ) {
      return (
        <ol>
          {word.toeicExampleSentences.map((sent, index) => (
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
  };

  // 渲染易混淆词区分组件
  const renderConfusingWords = () => {
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
  };

  return (
    <main className="detail-content" ref={contentRef}>
      <div className={`detail-card ${mode === 'modal' ? 'detail-card-modal' : ''}`}>
        <div className="detail-header">
          {mode === 'modal' && onClose && (
            <button
              type="button"
              className="word-detail-close"
              onClick={onClose}
              title="关闭"
            >
              ×
            </button>
          )}
          <div className="detail-header-main">
            <div
              className={`word-title ${onPlaySound ? cssPrefix + '-title-clickable' : ''}`}
              onClick={onPlaySound}
              title={onPlaySound ? "点击播放发音" : undefined}
            >
              {word.word}
            </div>
            {showEtymologyButton && (
              <button
                type="button"
                className="etymology-header-btn"
                onClick={() => setShowEtymology(true)}
                title="查看构词法"
              >
                📖
              </button>
            )}
            {showFavoriteButton && onToggleFavorite && (
              <button
                type="button"
                className={`favorite-btn ${isFavorite ? 'favorite-btn-active' : ''}`}
                onClick={onToggleFavorite}
                title={isFavorite ? '取消收藏该单词' : '收藏该单词'}
              >
                <span className="favorite-icon">{isFavorite ? '★' : '☆'}</span>
              </button>
            )}
          </div>
          <div className="phonetic">{word.phonetic || '/ˈwɜːrd/'}</div>
          {showProgress && progressCurrent !== undefined && progressTotal !== undefined && (
            <div className="word-progress">
              {progressCurrent} / {progressTotal}
            </div>
          )}
        </div>

        <div className="detail-section">
          <h3 className="section-title">核心释义</h3>
          <div
            className="section-content"
            dangerouslySetInnerHTML={{ __html: coreMeaning }}
          />
        </div>

        {(word.phrase || mode === 'page') && (
          <div className="detail-section">
            <h3 className="section-title">短语短句</h3>
            <div className="section-content">
              {word.phrase ? (
                <PhraseCell phraseText={word.phrase} />
              ) : (
                <p className={`${cssPrefix}-empty-text`}>暂无</p>
              )}
            </div>
          </div>
        )}

        <div className="detail-section">
          <h3 className="section-title">TOEIC场景重点</h3>
          <div
            className="section-content"
            dangerouslySetInnerHTML={{ __html: toeicSceneFocus }}
          />
        </div>

        <div className="detail-section">
          <h3 className="section-title">关键搭配</h3>
          <div
            className="section-content"
            dangerouslySetInnerHTML={{ __html: keyCollocationsHtml }}
          />
        </div>

        <div className="detail-section">
          <h3 className="section-title">TOEIC例句</h3>
          <div className="section-content">{renderExampleSentences()}</div>
        </div>

        {(word.sceneAssociation || mode === 'page') && (
          <div className="detail-section">
            <h3 className="section-title">场景联想</h3>
            <div
              className="section-content"
              dangerouslySetInnerHTML={{
                __html: word.sceneAssociation || '暂无',
              }}
            />
          </div>
        )}

        <div className="detail-section">
          <h3 className="section-title">易混淆词区分</h3>
          <div className="section-content">{renderConfusingWords()}</div>
        </div>
      </div>

      {showEtymologyButton && (
        <EtymologyBottomSheet
          isOpen={showEtymology}
          onClose={() => setShowEtymology(false)}
          word={word.word}
        />
      )}
    </main>
  );
}

export default WordDetailContent;

