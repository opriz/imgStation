import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Button,
} from '@mui/material';
import { Folder, NavigateNext, Refresh } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// 获取当前服务器的地址
const getServerAddress = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = '8080'; // 后端服务器端口
  return `${protocol}//${hostname}:${port}/api`;
};

const API_URL = getServerAddress();

function HistoryPage() {
  const [directories, setDirectories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();

  const fetchDirectories = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('正在请求目录列表...', `${API_URL}/directories`);
      const response = await axios.get(`${API_URL}/directories`);
      console.log('目录列表响应:', response.data);
      setDirectories(response.data.directories);
    } catch (error) {
      console.error('获取目录列表失败:', error);
      setError(error);
      setSnackbar({ 
        open: true, 
        message: '获取目录列表失败，请检查后端服务是否正常运行', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectories();
  }, []);

  const handleRetry = () => {
    fetchDirectories();
  };

  const handleDirectoryClick = (directory) => {
    navigate(`/upload/${directory}`);
  };

  if (loading && !error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          获取目录列表失败
        </Typography>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={handleRetry}
          sx={{ mt: 2 }}
        >
          重试
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        历史目录
      </Typography>

      {directories.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
          暂无历史目录
        </Typography>
      ) : (
        <List>
          {directories.map((directory) => (
            <ListItem
              key={directory}
              disablePadding
              secondaryAction={
                <IconButton edge="end">
                  <NavigateNext />
                </IconButton>
              }
            >
              <ListItemButton onClick={() => handleDirectoryClick(directory)}>
                <ListItemIcon>
                  <Folder />
                </ListItemIcon>
                <ListItemText primary={directory} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

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
    </Box>
  );
}

export default HistoryPage; 