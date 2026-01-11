import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { Volume2, Square, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import { getWordsByCategory, saveLearningProgress, getLearningProgress } from '../utils/app';
import { useSpeechConfig } from '../hooks/useSpeechConfig';
import WordDetailContent from '../components/WordDetailContent';
import BottomSheet from '../components/BottomSheet';
import './WordStudyPage.css';

function WordStudyPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animation controls
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacityKnown = useTransform(x, [50, 150], [0, 1]);
  const opacityUnknown = useTransform(x, [-50, -150], [0, 1]);

  // Audio
  const currentWord = words[currentIndex];
  const { start: playAudio, stop: stopAudio, isPlaying, isLoading } = useSpeechConfig(currentWord?.word || '');

  const handleAudioClick = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio();
    }
  };

  // Determine which icon to show
  let AudioIcon = Volume2;
  if (isLoading) AudioIcon = Loader2;
  if (isPlaying) AudioIcon = Square;

  useEffect(() => {
    async function loadData() {
      try {
        const allWords = await getWordsByCategory(category);
        const progress = await getLearningProgress(category);

        // Find first unlearned word or start from 0
        let startIndex = 0;
        if (progress && progress.lastIndex) {
          // Validate index is within bounds
          startIndex = Math.min(progress.lastIndex, allWords.length - 1);
        }

        setWords(allWords);
        setCurrentIndex(startIndex);
      } catch (error) {
        console.error('加载学习数据失败:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [category]);

  const handleDragEnd = async (event, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > 100 || velocity > 500) {
      await controls.start({ x: 500, opacity: 0 }); // Swipe Right (Known)
      handleStudyStatus('known');
    } else if (offset < -100 || velocity < -500) {
      await controls.start({ x: -500, opacity: 0 }); // Swipe Left (Unknown)
      handleStudyStatus('unknown');
    } else {
      controls.start({ x: 0, opacity: 1 }); // Reset
    }
  };

  const handleStudyStatus = async (status) => {
    // 1. Play exit animation if triggered by button click (drag handles its own, so we need to check if we need to animate)
    // simpler to just force animate if calling from buttons:
    if (status === 'known' && x.get() === 0) {
      await controls.start({ x: 500, opacity: 0 });
    } else if (status === 'unknown' && x.get() === 0) {
      await controls.start({ x: -500, opacity: 0 });
    } else if (status === 'fuzzy' && x.get() === 0) {
      // Fuzzy maybe swipes up or just fades? Let's just swipe right for now or fade
      await controls.start({ opacity: 0, scale: 0.9 });
    }

    // 2. Save progress
    const nextIndex = currentIndex + 1;
    await saveLearningProgress(category, {
      word: currentWord.word,
      status: status,
      timestamp: Date.now(),
      index: nextIndex // Save the NEXT index so we resume correctly
    });

    // 3. Move to next word
    if (currentIndex < words.length - 1) {
      setCurrentIndex(nextIndex);
      // Reset card position for new word
      x.set(0);
      controls.set({ x: 0, opacity: 1, scale: 1 });
    } else {
      alert('恭喜！本单元单词已学完');
      navigate('/');
    }
  };

  // Auto play audio when word changes
  useEffect(() => {
    if (currentWord) {
      // Optional: playAudio(); 
      // Many users prefer manual playback or only on first load.
      // Uncomment if auto-play is desired.
    }
  }, [currentWord]);

  if (loading) return (
    <div className="study-container">
      <Header title="学习中..." />
      <div className="flex-center h-full">加载中...</div>
    </div>
  );

  if (!currentWord) return (
    <div className="study-container">
      <Header title="出错了" />
      <div className="flex-center h-full">没有找到单词数据</div>
    </div>
  );

  return (
    <div className="study-container">
      {/* Header Area could be a proper Header component or custom */}
      <Header title="单词学习" />

      <div className="study-header-area">
        <div className="study-progress-container">
          <div className="study-progress-bg">
            <div
              className="study-progress-fill"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            ></div>
          </div>
          <span className="study-progress-text">{currentIndex + 1} / {words.length}</span>
        </div>
      </div>

      <div className="card-stack-container">
        <motion.div
          className="word-card"
          key={currentWord.word} // Key change forces remount for new word
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          style={{ x, rotate }}
          animate={controls}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 1.02 }}
        >
          {/* Visual Hints */}
          <motion.div style={{ opacity: opacityKnown }} className="swipe-hint hint-right">
            认识
          </motion.div>
          <motion.div style={{ opacity: opacityUnknown }} className="swipe-hint hint-left">
            不认识
          </motion.div>

          <div className="card-word-area">
            <h2 className="card-word">{currentWord.word}</h2>
            <div className="card-phonetic">{currentWord.phonetic}</div>

            <button
              className={`card-audio-btn ${isLoading ? 'loading' : ''} ${isPlaying ? 'playing' : ''}`}
              onClick={handleAudioClick}
            >
              <AudioIcon size={24} className={isLoading ? 'icon-spin' : ''} />
            </button>
          </div>

          <div className="card-example-area">
            {currentWord.toeicExampleSentences?.[0] ? (
              <>
                <p className="card-example-en">{currentWord.toeicExampleSentences[0].en}</p>
                <p className="card-example-cn">{currentWord.toeicExampleSentences[0].cn}</p>
              </>
            ) : (
              <p className="card-example-cn" style={{ textAlign: 'center', color: '#ccc' }}>暂无例句</p>
            )}
          </div>

          <button
            className="view-detail-link"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetail(true);
            }}
          >
            查看详情
          </button>
        </motion.div>
      </div>

      <div className="study-footer">
        <button
          className="btn-action btn-unknown"
          onClick={() => handleStudyStatus('unknown')}
        >
          不认识
        </button>
        <button
          className="btn-action btn-fuzzy"
          onClick={() => handleStudyStatus('fuzzy')}
        >
          模糊
        </button>
        <button
          className="btn-action btn-known"
          onClick={() => handleStudyStatus('known')}
        >
          认识
        </button>
      </div>

      <BottomSheet
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        height="85vh"
      >
        <WordDetailContent
          word={currentWord}
          mode="modal"
          onClose={() => setShowDetail(false)}
          onPlaySound={playAudio}
        />
      </BottomSheet>
    </div>
  );
}

export default WordStudyPage;
