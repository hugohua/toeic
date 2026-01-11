import React from 'react';
import { X, BookOpen, Heart, Volume2 } from 'lucide-react';
import PhraseCell from './PhraseCell';
import EtymologyBottomSheet from './EtymologyBottomSheet';
import DetailSection from './DetailSection'; // We can likely simplify this or inline it now
import ExampleSentences from './ExampleSentences';
import ConfusingWordsTable from './ConfusingWordsTable';
import { formatKeyCollocations } from '../utils/text';
import './WordDetailContent.css';

/**
 * Helper for Section Rendering
 */
const Section = ({ title, children, className = '' }) => (
  <section className={`detail-section ${className}`}>
    <div className="section-title">{title}</div>
    <div className="section-content">{children}</div>
  </section>
);

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
  showProgress = false,
}) {
  const [showEtymology, setShowEtymology] = React.useState(false);

  if (!word) {
    return null;
  }

  // Pre-process safe content
  const coreMeaning =
    word.coreMeaning ||
    (word.partOfSpeech ? `${word.partOfSpeech} ${word.coreMeaning}` : null);

  const toeicSceneFocus = word.toeicSceneFocus || word.sceneFocus;
  const keyCollocationsHtml = formatKeyCollocations(
    word.keyCollocations || word.usageCollocation
  );

  const hasExamples = word.toeicExampleSentences && word.toeicExampleSentences.length > 0;
  const hasPhrase = !!word.phrase;
  const hasSceneAssoc = !!word.sceneAssociation;
  const hasConfusing = word.confusingWordsComparison && word.confusingWordsComparison.length > 0;

  return (
    <main className="detail-content" ref={contentRef}>
      <div className={`detail-card ${mode === 'modal' ? 'detail-card-modal' : ''}`}>

        {/* Header */}
        <div className="detail-header">
          {mode === 'modal' && onClose && (
            <button
              type="button"
              className="word-detail-close"
              onClick={onClose}
              title="关闭"
            >
              <X size={24} />
            </button>
          )}

          <div className="detail-header-main">
            <div
              className={`word-title ${onPlaySound ? 'word-detail-title-clickable' : ''}`}
              onClick={onPlaySound}
              title={onPlaySound ? "点击播放发音" : undefined}
            >
              {word.word}
              {onPlaySound && <Volume2 size={24} color="var(--primary)" />}
            </div>

            <div className="header-actions">
              {showEtymologyButton && (
                <button
                  type="button"
                  className="etymology-header-btn"
                  onClick={() => setShowEtymology(true)}
                  title="查看构词法"
                >
                  <BookOpen size={20} color="var(--text-secondary)" />
                </button>
              )}
              {showFavoriteButton && onToggleFavorite && (
                <button
                  type="button"
                  className={`favorite-btn ${isFavorite ? 'favorite-btn-active' : ''}`}
                  onClick={onToggleFavorite}
                  title={isFavorite ? '取消收藏该单词' : '收藏该单词'}
                >
                  <Heart size={20} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : 'var(--text-secondary)'} />
                </button>
              )}
            </div>
          </div>

          <div className="phonetic">{word.phonetic || '/.../'}</div>

          {showProgress && progressCurrent !== undefined && (
            <div className="word-progress text-xs text-secondary mt-2">
              {progressCurrent} / {progressTotal}
            </div>
          )}
        </div>

        {/* Content Sections */}
        {coreMeaning ? (
          <Section title="核心释义">
            <div dangerouslySetInnerHTML={{ __html: coreMeaning }} />
          </Section>
        ) : (
          <Section title="核心释义">
            <span className="word-detail-empty-text">暂无释义</span>
          </Section>
        )}

        {(hasPhrase || mode === 'page') && (
          <Section title="短语短句">
            {hasPhrase ? (
              <PhraseCell phraseText={word.phrase} />
            ) : (
              <span className="word-detail-empty-text">暂无</span>
            )}
          </Section>
        )}

        {toeicSceneFocus ? (
          <Section title="TOEIC场景重点">
            <div dangerouslySetInnerHTML={{ __html: toeicSceneFocus }} />
          </Section>
        ) : (
          <Section title="TOEIC场景重点">
            <span className="word-detail-empty-text">暂无</span>
          </Section>
        )}

        {keyCollocationsHtml ? (
          <Section title="关键搭配">
            <div dangerouslySetInnerHTML={{ __html: keyCollocationsHtml }} />
          </Section>
        ) : (
          <Section title="关键搭配">
            <span className="word-detail-empty-text">暂无</span>
          </Section>
        )}

        <Section title="TOEIC例句">
          {hasExamples ? (
            <ExampleSentences
              sentences={word.toeicExampleSentences}
              cssPrefix={cssPrefix}
            />
          ) : (
            <span className="word-detail-empty-text">暂无例句</span>
          )}
        </Section>

        {(hasSceneAssoc || mode === 'page') && (
          <Section title="场景联想">
            <div dangerouslySetInnerHTML={{ __html: word.sceneAssociation || '暂无' }} />
          </Section>
        )}

        {hasConfusing && (
          <Section title="易混淆词区分">
            <ConfusingWordsTable word={word} cssPrefix={cssPrefix} />
          </Section>
        )}

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

