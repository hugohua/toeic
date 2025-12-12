import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WordStudyPage from './pages/WordStudyPage';
import WordDetailPage from './pages/WordDetailPage';
import WordBrowsePage from './pages/WordBrowsePage';
import WordListPage from './pages/WordListPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/study/:category" element={<WordStudyPage />} />
      <Route path="/detail/:category/:index" element={<WordDetailPage />} />
      <Route path="/browse/:category" element={<WordBrowsePage />} />
      <Route path="/list/:category" element={<WordListPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}

export default App;
