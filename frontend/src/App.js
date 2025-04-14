import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ViewPage from './pages/ViewPage';
import HistoryPage from './pages/HistoryPage';
import { Container } from '@mui/material';

function App() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/upload/:directory" element={<UploadPage />} />
        <Route path="/view/:directory" element={<ViewPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </Container>
  );
}

export default App; 