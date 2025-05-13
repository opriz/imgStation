import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import DirectoryManagement from './pages/DirectoryManagement';
import MainLayout from './components/Layout';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<MainLayout />}>
            <Route index element={<Navigate to="/app/directories" replace />} />
            <Route path="directories" element={<DirectoryManagement />} />
            <Route path="users" element={<UserManagement />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App; 