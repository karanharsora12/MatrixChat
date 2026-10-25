import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { socketService } from '../services/socket';

export interface RequestOtpOptions {
  type?: 'phone' | 'email';
  phoneNumber?: string;
  countryCode?: string;
  email?: string;
  identifier?: string;
}

export interface VerifyOtpOptions {
  identifier?: string;
  phoneNumber?: string;
  email?: string;
  otp: string;
}

export interface RequestOtpResponse {
  success: boolean;
  message?: string;
  identifier?: string;
  phoneNumber?: string;
  email?: string;
  type?: 'phone' | 'email';
  resendAfter: number;
  isDev?: boolean;
  devCode?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  requestOtp: (options: RequestOtpOptions | string, countryCode?: string) => Promise<RequestOtpResponse>;
  verifyOtp: (options: VerifyOtpOptions | string, otp?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await api.getSession();
      if (res.authenticated && res.user) {
        setUser(res.user);
        socketService.connect();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const requestOtp = async (options: RequestOtpOptions | string, countryCode = '+1') => {
    return api.requestOtp(options, countryCode);
  };

  const verifyOtp = async (options: VerifyOtpOptions | string, otp?: string) => {
    const res = await api.verifyOtp(options, otp);
    setUser(res.user);
    socketService.connect();
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      socketService.disconnect();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, requestOtp, verifyOtp, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
