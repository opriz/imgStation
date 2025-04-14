import React, { useState } from 'react';
import { Box, Button, Typography, Container, Snackbar, Alert } from '@mui/material';
import { Add, History } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// 获取当前服务器的地址
const getServerAddress = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = '8080'; // 后端服务器端口
  return `${protocol}//${hostname}:${port}/api`;
};

const API_URL = getServerAddress();

function HomePage() {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleCreateDirectory = async () => {
    try {
      const response = await axios.post(`${API_URL}/directory`);
      navigate(`/upload/${response.data.directory}`);
    } catch (error) {
      console.error('创建目录失败:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.error || '创建目录失败，请检查后端服务是否正常运行', 
        severity: 'error' 
      });
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          gap: 3,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          图片中转站
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={handleCreateDirectory}
          sx={{ width: '100%', maxWidth: 300 }}
        >
          创建新目录
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<History />}
          onClick={() => navigate('/history')}
          sx={{ width: '100%', maxWidth: 300 }}
        >
          查看历史目录
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default HomePage; 