import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Card,
  CardMedia,
  CardActions,
  Dialog,
  DialogContent,
} from '@mui/material';
import { Delete, Close, Download, CheckCircle, NavigateBefore, NavigateNext } from '@mui/icons-material';
import axios from 'axios';
import { useParams } from 'react-router-dom';

// 获取当前服务器的地址
const getServerAddress = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = '8080'; // 后端服务器端口
  return `${protocol}//${hostname}:${port}/api`;
};

const API_URL = getServerAddress();

function ViewPage() {
  const { directory } = useParams();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [downloadedImages, setDownloadedImages] = useState(new Set());
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (directory) {
        try {
          setLoading(true);
          console.log('正在获取图片列表...', directory);
          const response = await axios.get(`${API_URL}/directory/${directory}`);
          console.log('获取到的图片列表:', response.data.files);
          if (isMounted) {
            setImages(response.data.files || []);
          }
        } catch (error) {
          console.error('获取图片列表失败:', error);
          if (isMounted) {
            setSnackbar({ open: true, message: '获取图片列表失败', severity: 'error' });
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [directory]);

  const handleDeleteImage = async (filename) => {
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/file/${directory}/${filename}`);
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
    setSelectedImage(`${API_URL}/storage/${directory}/${filename}`);
    setShowImageDialog(true);
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      const prevIndex = currentImageIndex - 1;
      setCurrentImageIndex(prevIndex);
      setSelectedImage(`${API_URL}/storage/${directory}/${images[prevIndex]}`);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      const nextIndex = currentImageIndex + 1;
      setCurrentImageIndex(nextIndex);
      setSelectedImage(`${API_URL}/storage/${directory}/${images[nextIndex]}`);
    }
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

  const handleDownload = async (filename) => {
    try {
      const downloadUrl = `${API_URL}/file?directory=${directory}&filename=${encodeURIComponent(filename)}`;
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      // 将下载的图片添加到已下载集合中
      setDownloadedImages(prev => new Set([...prev, filename]));
    } catch (error) {
      console.error('下载失败:', error);
      setSnackbar({ open: true, message: '下载失败', severity: 'error' });
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

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom 
        align="center"
        sx={{ 
          mb: 4,
          fontWeight: 'bold',
          color: 'primary.main',
        }}
      >
        图片浏览
      </Typography>
      <Typography 
        variant="body2" 
        align="center"
        sx={{ 
          mb: 4,
          color: 'text.secondary',
          fontStyle: 'italic',
          whiteSpace: 'pre-line',
        }}
      >
        图片保留24小时，请及时下载{'\n'}zhujianxyz@163.com // tel: (+86) 158-2746-8135
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : images.length === 0 ? (
        <Paper 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            backgroundColor: 'background.default',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <Typography variant="h6" color="text.secondary">
            暂无图片
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {images.map((filename) => (
            <Grid item xs={12} sm={6} md={4} key={filename}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={`${API_URL}/storage/${directory}/${filename}`}
                  alt={filename}
                  onClick={() => handleImageClick(filename)}
                  sx={{ 
                    cursor: 'pointer',
                    objectFit: 'cover',
                    '&:hover': {
                      opacity: 0.9,
                    },
                  }}
                />
                <CardActions sx={{ 
                  p: 1,
                  justifyContent: 'flex-end',
                  backgroundColor: 'transparent',
                }}>
                  <IconButton
                    size="small"
                    color={downloadedImages.has(filename) ? "success" : "primary"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(filename);
                    }}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    {downloadedImages.has(filename) ? <CheckCircle /> : <Download />}
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default ViewPage; 