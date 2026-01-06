import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  searchWords as searchWordsAPI,
  getWordsByCategory,
  getWordIndexInCategory,
} from '../services/api';
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

  // 搜索功能（使用 API）
  const searchWords = async (query, maxResults = 10) => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const results = await searchWordsAPI(query, maxResults);
      // API 返回的结果已经包含 category_name，需要转换为 category
      return results.map((word) => ({
        ...word,
        category: word.category_name || word.category,
      }));
    } catch (error) {
      console.error('搜索失败:', error);
      return [];
    }
  };

  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length === 0) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const results = await searchWords(query, 10);
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

  const handleResultClick = async (word) => {
    if (!word || !word.word || !word.category) {
      return;
    }
    const category = word.category_name || word.category;

    try {
      // 使用轻量级API只获取索引,而不是完整列表
      const wordIndex = await getWordIndexInCategory(word.word, category);
      if (wordIndex !== null) {
        navigate(`/detail/${category}/${wordIndex}`);
        setIsSearchExpanded(false);
        setSearchQuery('');
        setShowDropdown(false);
      } else {
        console.error('未找到单词索引');
      }
    } catch (error) {
      console.error('获取单词索引失败:', error);
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
              <span className="iconfont icon-left"></span>
            </button>
          )}
          <button
            className="home-btn"
            onClick={() => navigate('/')}
            title="返回首页"
            aria-label="返回首页"
          >
            <span className="iconfont icon-appstore"></span>
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
                <span className="iconfont icon-search"></span>
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
            <span className="iconfont icon-user"></span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
