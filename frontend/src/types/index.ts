export type UserRole = 'super_admin' | 'user';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Directory {
  id: number;
  name: string;
  path: string;
  user_id: number;
  user: User;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
} 