import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordData } from '../data';
import './Header.css';

function Header({
  title,
  subtitle,
  showBack = false,
  showProgress = false,
  currentIndex = 0,
  totalWords = 0,
}) {
  const navigate = useNavigate();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // 搜索功能
  const searchWords = (query, maxResults = 10) => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const allWords = [];
    for (const category in wordData) {
      if (wordData.hasOwnProperty(category)) {
        const words = wordData[category];
        if (Array.isArray(words)) {
          words.forEach((word) => {
            if (word && typeof word === 'object') {
              allWords.push({ ...word, category });
            }
          });
        }
      }
    }

    const results = [];
    const queryLower = query.toLowerCase().trim();

    for (const word of allWords) {
      // 安全检查：确保word对象和word.word属性存在
      if (!word || !word.word) {
        continue;
      }

      let score = 0;
      let matched = false;

      const wordText = String(word.word).toLowerCase();
      if (wordText.includes(queryLower)) {
        score += 100;
        matched = true;
        if (wordText.startsWith(queryLower)) {
          score += 50;
        }
      }

      if (word.coreMeaning && typeof word.coreMeaning === 'string') {
        if (word.coreMeaning.toLowerCase().includes(queryLower)) {
          score += 30;
          matched = true;
        }
      }

      if (word.toeicSceneFocus && typeof word.toeicSceneFocus === 'string') {
        if (word.toeicSceneFocus.toLowerCase().includes(queryLower)) {
          score += 20;
          matched = true;
        }
      }

      if (word.sceneFocus && typeof word.sceneFocus === 'string') {
        if (word.sceneFocus.toLowerCase().includes(queryLower)) {
          score += 20;
          matched = true;
        }
      }

      if (matched) {
        results.push({ word, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults).map((item) => item.word);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // 检查wordData是否可用
    if (!wordData || typeof wordData !== 'object') {
      console.error('wordData is not available');
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const results = searchWords(query, 10);
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleSearchIconClick = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleSearchBlur = () => {
    setTimeout(() => {
      if (searchQuery.trim() === '') {
        setIsSearchExpanded(false);
        setShowDropdown(false);
      }
    }, 200);
  };

  const handleResultClick = (word) => {
    if (!word || !word.word || !word.category) {
      return;
    }
    const category = word.category;
    const categoryWords = wordData[category];
    if (!categoryWords || !Array.isArray(categoryWords)) {
      return;
    }
    const wordIndex = categoryWords.findIndex((w) => w && w.word === word.word);
    if (wordIndex !== -1) {
      navigate(`/detail/${category}/${wordIndex}`);
      setIsSearchExpanded(false);
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  const highlightMatch = (text, query) => {
    if (!query || !text) return String(text || '');
    const textStr = String(text);
    const queryStr = String(query);
    if (!queryStr.trim()) return textStr;
    try {
      const regex = new RegExp(
        `(${queryStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
        'gi'
      );
      return textStr.replace(regex, '<mark>$1</mark>');
    } catch (e) {
      console.error('Highlight match error:', e);
      return textStr;
    }
  };

  // 点击外部关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        {/* 左侧：返回按钮和首页按钮 */}
        <div className="header-left">
          {showBack && (
            <button className="back-btn" onClick={() => navigate(-1)}>
              ←
            </button>
          )}
          <button
            className="home-btn"
            onClick={() => navigate('/')}
            title="返回首页"
            aria-label="返回首页"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
        </div>

        {/* 中间：标题和进度 */}
        <div className="header-center">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
          {showProgress && (
            <div className="header-progress">
              <span>{currentIndex}</span> / <span>{totalWords}</span>
            </div>
          )}
        </div>

        {/* 右侧：搜索和个人中心 */}
        <div className="header-right">
          <div className="search-container" ref={searchContainerRef}>
            {!isSearchExpanded && (
              <button
                className="search-icon-btn"
                onClick={handleSearchIconClick}
                type="button"
                aria-label="搜索"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </button>
            )}
            {isSearchExpanded && (
              <>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-input"
                  placeholder="搜索单词或词义..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onBlur={handleSearchBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchQuery('');
                      setIsSearchExpanded(false);
                      setShowDropdown(false);
                    }
                  }}
                />
                {showDropdown && searchResults.length > 0 && (
                  <div className="search-dropdown" style={{ display: 'block' }}>
                    {searchResults
                      .filter((word) => word && word.word) // 过滤掉无效的单词对象
                      .map((word, index) => {
                        const meaning = word.coreMeaning || '';
                        const meaningText =
                          typeof meaning === 'string' && meaning.length > 50
                            ? meaning.substring(0, 50) + '...'
                            : meaning;
                        return (
                          <div
                            key={`${word.category}-${word.word}-${index}`}
                            className="search-item"
                            onClick={() => handleResultClick(word)}
                          >
                            <div
                              className="search-item-word"
                              dangerouslySetInnerHTML={{
                                __html: highlightMatch(
                                  String(word.word),
                                  searchQuery
                                ),
                              }}
                            />
                            <div
                              className="search-item-meaning"
                              dangerouslySetInnerHTML={{
                                __html: highlightMatch(
                                  String(meaningText),
                                  searchQuery
                                ),
                              }}
                            />
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}
          </div>
          <button
            className="profile-btn"
            onClick={() => navigate('/profile')}
            type="button"
            aria-label="个人中心"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
