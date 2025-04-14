import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  CardActions,
} from '@mui/material';
import { PhotoCamera, QrCode2, Delete, Edit, CloudUpload, Refresh, Close, NavigateBefore, NavigateNext } from '@mui/icons-material';
import axios from 'axios';
import QRCode from 'react-qr-code';
import { useParams } from 'react-router-dom';

// 获取当前服务器的地址
const getServerAddress = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = '8080'; // 后端服务器端口
  return `${protocol}//${hostname}:${port}/api`;
};

const API_URL = getServerAddress();

function UploadPage() {
  const { directory } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentDirectory, setCurrentDirectory] = useState(directory || '');
  const [showQR, setShowQR] = useState(false);
  const [images, setImages] = useState([]);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState('');
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  useEffect(() => {
    if (directory) {
      setCurrentDirectory(directory);
    }
  }, [directory]);

  useEffect(() => {
    if (currentDirectory) {
      fetchImages();
    }
  }, [currentDirectory]);

  const fetchImages = async () => {
    try {
      console.log('正在获取图片列表...', currentDirectory);
      const response = await axios.get(`${API_URL}/directory/${currentDirectory}`);
      console.log('获取到的图片列表:', response.data.files);
      setImages(response.data.files || []);
    } catch (error) {
      console.error('获取图片列表失败:', error);
      setSnackbar({ open: true, message: '获取图片列表失败', severity: 'error' });
    }
  };

  const handleFileSelect = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    if (!currentDirectory) {
      setSnackbar({ open: true, message: '请输入目录名称', severity: 'warning' });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(`${API_URL}/upload/${currentDirectory}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSnackbar({ open: true, message: '上传成功', severity: 'success' });
      fetchImages();
    } catch (error) {
      console.error('Upload error:', error);
      setSnackbar({ open: true, message: '上传失败', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handleRenameDirectory = () => {
    setNewDirectoryName(currentDirectory);
    setShowRenameDialog(true);
  };

  const handleRenameConfirm = async () => {
    if (!newDirectoryName) {
      setSnackbar({ open: true, message: '请输入新的目录名称', severity: 'warning' });
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/directory/rename`, {
        oldName: currentDirectory,
        newName: newDirectoryName,
      });
      setCurrentDirectory(newDirectoryName);
      setShowRenameDialog(false);
      setSnackbar({ open: true, message: '目录重命名成功', severity: 'success' });
    } catch (error) {
      console.error('Rename error:', error);
      setSnackbar({ open: true, message: '目录重命名失败', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (filename) => {
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/file/${currentDirectory}/${filename}`);
      setImages(images.filter(img => img !== filename));
      setSnackbar({ open: true, message: '图片删除成功', severity: 'success' });
    } catch (error) {
      console.error('Delete error:', error);
      setSnackbar({ open: true, message: '图片删除失败', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (filename) => {
    const index = images.indexOf(filename);
    setCurrentImageIndex(index);
    setSelectedImage(`${API_URL}/storage/${currentDirectory}/${filename}`);
    setShowImageDialog(true);
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      const prevIndex = currentImageIndex - 1;
      setCurrentImageIndex(prevIndex);
      setSelectedImage(`${API_URL}/storage/${currentDirectory}/${images[prevIndex]}`);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      const nextIndex = currentImageIndex + 1;
      setCurrentImageIndex(nextIndex);
      setSelectedImage(`${API_URL}/storage/${currentDirectory}/${images[nextIndex]}`);
    }
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;

    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50; // 最小滑动距离

    if (Math.abs(distance) < minSwipeDistance) return;

    if (distance > 0) {
      // 向左滑动，显示下一张
      handleNextImage();
    } else {
      // 向右滑动，显示上一张
      handlePrevImage();
    }

    // 重置触摸位置
    setTouchStartX(0);
    setTouchEndX(0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showImageDialog) {
        if (e.key === 'ArrowLeft') {
          handlePrevImage();
        } else if (e.key === 'ArrowRight') {
          handleNextImage();
        } else if (e.key === 'Escape') {
          setShowImageDialog(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImageDialog, currentImageIndex, images]);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        图片中转站
      </Typography>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div">
          当前目录：{currentDirectory}
        </Typography>
        <IconButton onClick={handleRenameDirectory} color="primary">
          <Edit />
        </IconButton>
      </Paper>

      <Dialog open={showRenameDialog} onClose={() => setShowRenameDialog(false)}>
        <DialogTitle>修改目录名称</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="新目录名称"
            fullWidth
            value={newDirectoryName}
            onChange={(e) => setNewDirectoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRenameDialog(false)}>取消</Button>
          <Button onClick={handleRenameConfirm} color="primary">
            确定
          </Button>
        </DialogActions>
      </Dialog>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setShowQR(!showQR)}
              disabled={!currentDirectory}
              fullWidth
              startIcon={<QrCode2 />}
              sx={{
                height: '48px',
                fontSize: '1.1rem',
                textTransform: 'none',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                '&:hover': {
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                },
              }}
            >
              {showQR ? '隐藏二维码' : '显示二维码'}
            </Button>
          </Grid>
        </Grid>

        {showQR && currentDirectory && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <QRCode value={`${window.location.origin}/view/${currentDirectory}`} />
          </Box>
        )}
      </Paper>

      <Paper 
        sx={{ 
          p: 2,
          mb: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="upload-button"
          multiple
          type="file"
          onChange={handleFileSelect}
        />
        <label htmlFor="upload-button" style={{ width: '100%' }}>
          <Button
            variant="contained"
            component="span"
            startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
            disabled={loading || !currentDirectory}
            fullWidth
            sx={{
              height: '48px',
              fontSize: '1.1rem',
              textTransform: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1E88E5 90%)',
                boxShadow: '0 6px 8px rgba(0,0,0,0.2)',
              },
              '&:disabled': {
                background: '#e0e0e0',
                color: '#9e9e9e',
              },
            }}
          >
            {loading ? '上传中...' : '选择并上传图片'}
          </Button>
        </label>
        <Typography variant="body2" color="text.secondary" align="center">
          支持多选图片，点击或拖拽文件到此处
        </Typography>
      </Paper>

      {images.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            已上传图片
          </Typography>
          <Grid container spacing={2}>
            {images.map((filename) => (
              <Grid item xs={12} sm={6} md={4} key={filename}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={`${API_URL}/storage/${currentDirectory}/${filename}`}
                    alt={filename}
                    onClick={() => handleImageClick(filename)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <CardActions sx={{ 
                    p: 1,
                    justifyContent: 'flex-end',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteImage(filename)}
                      sx={{
                        marginLeft: 'auto',
                        '&:hover': {
                          backgroundColor: 'transparent',
                        },
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      <Dialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            maxHeight: '90vh',
          }
        }}
      >
        <DialogContent sx={{ 
          p: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'transparent',
          height: '100%',
          minHeight: '400px',
          maxHeight: '80vh',
        }}>
          <Box sx={{ 
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            border: '10px solid white',
            overflow: 'hidden',
          }}>
            <img
              src={selectedImage}
              alt="预览"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ 
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                userSelect: 'none',
                touchAction: 'pan-y',
              }}
            />
            {currentImageIndex > 0 && (
              <IconButton
                onClick={handlePrevImage}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
              >
                <NavigateBefore />
              </IconButton>
            )}
            {currentImageIndex < images.length - 1 && (
              <IconButton
                onClick={handleNextImage}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
              >
                <NavigateNext />
              </IconButton>
            )}
            <IconButton
              onClick={() => setShowImageDialog(false)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>

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

export default UploadPage; 