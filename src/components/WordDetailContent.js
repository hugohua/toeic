import React from 'react';
import PhraseCell from './PhraseCell';
import EtymologyBottomSheet from './EtymologyBottomSheet';
import DetailSection from './DetailSection';
import ExampleSentences from './ExampleSentences';
import ConfusingWordsTable from './ConfusingWordsTable';
import { formatKeyCollocations } from '../utils/text';

/**
 * WordDetailContent - 公共的单词详情展示组件
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

        <DetailSection title="核心释义" htmlContent={coreMeaning} />

        {(word.phrase || mode === 'page') && (
          <DetailSection title="短语短句">
            {word.phrase ? (
              <PhraseCell phraseText={word.phrase} />
            ) : (
              <p className={`${cssPrefix}-empty-text`}>暂无</p>
            )}
          </DetailSection>
        )}

        <DetailSection title="TOEIC场景重点" htmlContent={toeicSceneFocus} />

        <DetailSection title="关键搭配" htmlContent={keyCollocationsHtml} />

        <DetailSection title="TOEIC例句">
          <ExampleSentences
            sentences={word.toeicExampleSentences}
            cssPrefix={cssPrefix}
          />
        </DetailSection>

        {(word.sceneAssociation || mode === 'page') && (
          <DetailSection
            title="场景联想"
            htmlContent={word.sceneAssociation || '暂无'}
          />
        )}

        <DetailSection title="易混淆词区分">
          <ConfusingWordsTable word={word} cssPrefix={cssPrefix} />
        </DetailSection>
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

