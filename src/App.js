import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WordStudyPage from './pages/WordStudyPage';
import WordDetailPage from './pages/WordDetailPage';
import WordBrowsePage from './pages/WordBrowsePage';
import WordListPage from './pages/WordListPage';
import ProfilePage from './pages/ProfilePage';
import TestSpeechPage from './pages/TestSpeechPage';
import SpecialWordListPage from './pages/SpecialWordListPage';
import WordImportPage from './pages/WordImportPage';
import CategoryAddPage from './pages/CategoryAddPage';
import WordArticlePage from './pages/WordArticlePage';
import ArticleListPage from './pages/ArticleListPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import NoteListPage from './pages/NoteListPage';
import NoteDetailPage from './pages/NoteDetailPage';
import { initCategoryCache } from './utils/app';
import { PopupContainer } from './components/Popup';

function App() {
  // 初始化分类缓存
  useEffect(() => {
    initCategoryCache().catch((error) => {
      console.error('初始化分类缓存失败:', error);
    });
  }, []);

  return (
    <>
      <PopupContainer />
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/study/:category" element={<WordStudyPage />} />
      <Route path="/detail/:category/:index" element={<WordDetailPage />} />
      <Route path="/browse/:category" element={<WordBrowsePage />} />
      <Route path="/list/:category" element={<WordListPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/test-speech" element={<TestSpeechPage />} />
      <Route path="/special/:listType" element={<SpecialWordListPage />} />
      <Route path="/import" element={<WordImportPage />} />
      <Route path="/category/add" element={<CategoryAddPage />} />
      <Route path="/article" element={<WordArticlePage />} />
      <Route path="/articles" element={<ArticleListPage />} />
      <Route path="/article/:id" element={<ArticleDetailPage />} />
      <Route path="/notes" element={<NoteListPage />} />
      <Route path="/note/:id" element={<NoteDetailPage />} />
      </Routes>
    </>
  );
}

export default App;
