import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSpeech } from 'react-text-to-speech';
import Header from '../components/Header';
import { getArticleById, getWordByWordAndCategory, searchWords } from '../utils/api';
import PhraseCell from '../components/PhraseCell';
import '../index.css';
import './WordArticlePage.css';

// 例句组件，支持提取英文部分并发音
function ExampleSentence({ sentence }) {
  const extractEnglishText = (text) => {
    if (!text) return { english: '', remaining: '' };
    const match = text.match(/^([^(（]+)([（(].*)?$/);
    if (match) {
      return {
        english: match[1].trim(),
        remaining: match[2] || '',
      };
    }
    return { english: text, remaining: '' };
  };

  const { english: englishText, remaining: remainingText } = extractEnglishText(sentence);
  const { start } = useSpeech({
    text: englishText || '',
    pitch: 1,
    rate: 1,
    volume: 1,
  });

  return (
    <span>
      <span
        onClick={() => {
          start();
        }}
        style={{ cursor: 'pointer' }}
        title="点击播放发音"
      >
        {englishText}
      </span>
      {remainingText}
    </span>
  );
}

// 单词标题组件，支持发音
function WordTitle({ word }) {
  const { start } = useSpeech({
    text: word || '',
    pitch: 1,
    rate: 1,
    volume: 1,
  });

  return (
    <div
      className="word-detail-title"
      onClick={() => start()}
      style={{ cursor: 'pointer' }}
      title="点击播放发音"
    >
      {word}
    </div>
  );
}

function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordDetail, setWordDetail] = useState(null);
  const [isLoadingWordDetail, setIsLoadingWordDetail] = useState(false);
  const articleRef = useRef(null);

  // 加载文章详情
  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getArticleById(parseInt(id));
      if (!data) {
        setError('文章不存在');
        setArticle(null);
        return;
      }
      setArticle(data);
    } catch (err) {
      console.error('加载文章详情失败:', err);
      setError('加载文章详情失败: ' + err.message);
      setArticle(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理单词点击事件
  const handleWordClick = async (wordText) => {
    if (!wordText || !article) return;
    
    // 清理单词文本（移除可能的标点符号）
    const cleanWord = wordText.trim().toLowerCase().replace(/[.,!?;:()\[\]{}'"]/g, '');
    if (!cleanWord) return;

    setSelectedWord(cleanWord);
    setIsLoadingWordDetail(true);
    setWordDetail(null);

    try {
      // 从文章的分类中查找
      let found = false;
      const categories = article.categories || [];
      
      for (const category of categories) {
        try {
          const detail = await getWordByWordAndCategory(cleanWord, category);
          if (detail) {
            setWordDetail(detail);
            found = true;
            break;
          }
        } catch (err) {
          // 继续尝试下一个分类
          continue;
        }
      }

      // 如果没找到，尝试搜索所有单词
      if (!found) {
        const searchResults = await searchWords(cleanWord, 10);
        const exactMatch = searchResults.find(w => w.word.toLowerCase() === cleanWord);
        if (exactMatch) {
          // 如果找到精确匹配，获取详情
          try {
            const detail = await getWordByWordAndCategory(cleanWord, exactMatch.category_name);
            if (detail) {
              setWordDetail(detail);
              found = true;
            }
          } catch (err) {
            console.error('获取单词详情失败:', err);
          }
        }
      }

      if (!found) {
        setError(`未找到单词 "${wordText}" 的详情`);
      }
    } catch (err) {
      console.error('查找单词失败:', err);
      setError('查找单词详情失败: ' + err.message);
    } finally {
      setIsLoadingWordDetail(false);
    }
  };

  // 格式化文章内容（处理加粗标记并添加点击事件）
  const formatArticle = (content) => {
    if (!content) return '';
    
    // 将 **word** 转换为可点击的 <strong>word</strong>
    let formatted = content.replace(/\*\*(.*?)\*\*/g, (match, wordText) => {
      return `<strong class="word-highlight" data-word="${wordText.trim()}">${wordText}</strong>`;
    });
    
    // 将换行符转换为 <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  };

  // 添加点击事件监听
  useEffect(() => {
    if (!article || !articleRef.current) return;

    const handleClick = (e) => {
      const wordElement = e.target.closest('.word-highlight');
      if (wordElement) {
        const wordText = wordElement.getAttribute('data-word');
        if (wordText) {
          handleWordClick(wordText);
        }
      }
    };

    const articleElement = articleRef.current;
    articleElement.addEventListener('click', handleClick);

    return () => {
      articleElement.removeEventListener('click', handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article]);

  // 关闭弹窗
  const handleCloseModal = () => {
    setSelectedWord(null);
    setWordDetail(null);
    setError('');
  };

  // 渲染单词详情内容
  const renderWordDetail = () => {
    if (!wordDetail) return null;

    const coreMeaning = wordDetail.coreMeaning || '暂无';
    const toeicSceneFocus = wordDetail.toeicSceneFocus || wordDetail.sceneFocus || '暂无';
    
    let keyCollocationsHtml = '';
    if (wordDetail.keyCollocations && Array.isArray(wordDetail.keyCollocations)) {
      keyCollocationsHtml =
        '<ul>' +
        wordDetail.keyCollocations.map((coll) => `<li>${coll}</li>`).join('') +
        '</ul>';
    } else {
      keyCollocationsHtml = '暂无';
    }

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
        return <p style={{ color: '#999' }}>暂无例句</p>;
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
                  <td>{item.word}</td>
                  <td>{item.coreDifference}</td>
                  <td>{item.toeicSceneFocus}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <button className="word-detail-close" onClick={handleCloseModal}>×</button>
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
  };

  if (isLoading) {
    return (
      <div className="container">
        <Header title="文章详情" showBack />
        <main className="article-content">
          <div className="loading-message">加载中...</div>
        </main>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="container">
        <Header title="文章详情" showBack />
        <main className="article-content">
          <div className="error-message">{error}</div>
        </main>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container">
        <Header title="文章详情" showBack />
        <main className="article-content">
          <div className="error-message">文章不存在</div>
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header title="文章详情" showBack />
      <main className="article-content">
        {/* 文章标题 */}
        <div className="article-display">
          <h3 className="section-title">{article.title}</h3>
          <div
            ref={articleRef}
            className="article-text"
            dangerouslySetInnerHTML={{ __html: formatArticle(article.content) }}
          />
        </div>

        {/* 单词详情弹窗 */}
        {(selectedWord || wordDetail) && (
          <div className="word-detail-modal-overlay" onClick={handleCloseModal}>
            <div className="word-detail-modal" onClick={(e) => e.stopPropagation()}>
              {isLoadingWordDetail ? (
                <div className="word-detail-loading">加载中...</div>
              ) : wordDetail ? (
                renderWordDetail()
              ) : (
                <div className="word-detail-loading">未找到单词详情</div>
              )}
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="error-message">{error}</div>
        )}
      </main>
    </div>
  );
}

export default ArticleDetailPage;

