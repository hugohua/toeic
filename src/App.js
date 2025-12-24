import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WordStudyPage from './pages/WordStudyPage';
import WordDetailPage from './pages/WordDetailPage';
import WordBrowsePage from './pages/WordBrowsePage';
import WordListPage from './pages/WordListPage';
import ProfilePage from './pages/ProfilePage';
import TestSpeechPage from './pages/TestSpeechPage';
import FavoriteWordListPage from './pages/FavoriteWordListPage';
import WordImportPage from './pages/WordImportPage';
import CategoryAddPage from './pages/CategoryAddPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/study/:category" element={<WordStudyPage />} />
      <Route path="/detail/:category/:index" element={<WordDetailPage />} />
      <Route path="/browse/:category" element={<WordBrowsePage />} />
      <Route path="/list/:category" element={<WordListPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/test-speech" element={<TestSpeechPage />} />
      <Route path="/favorites" element={<FavoriteWordListPage />} />
      <Route path="/import" element={<WordImportPage />} />
      <Route path="/category/add" element={<CategoryAddPage />} />
    </Routes>
  );
}

export default App;
