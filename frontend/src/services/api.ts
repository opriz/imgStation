import axios from 'axios';
import { User, Directory, LoginResponse, ApiResponse } from '../types';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
});

// 请求拦截器：添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 用户相关 API
export const userApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/users/login', { username, password }),
  
  register: (username: string, password: string) =>
    api.post<ApiResponse>('/users/register', { username, password }),
  
  getCurrentUser: () => api.get<User>('/users/me'),
  
  updatePassword: (password: string) =>
    api.put<ApiResponse>('/users/me', { password }),
  
  listUsers: () => api.get<User[]>('/users'),
  
  createUser: (username: string, password: string, role: string) =>
    api.post<ApiResponse>('/users', { username, password, role }),
  
  deleteUser: (id: number) => api.delete<ApiResponse>(`/users/${id}`),
};

// 目录相关 API
export const directoryApi = {
  listDirectories: () => api.get<Directory[]>('/directories'),
  
  createDirectory: (name: string, path: string) =>
    api.post<Directory>('/directories', { name, path }),
  
  deleteDirectory: (id: number) =>
    api.delete<ApiResponse>(`/directories/${id}`),
}; 