'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@/types';
import { authAPI } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingEmail: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; needsVerification?: boolean }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  resendCode: (email: string) => Promise<{ success: boolean; message: string }>;
  googleLogin: (credential: string) => Promise<{ success: boolean; message: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('voting_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authAPI.getMe(token);
      if (response.code === 'SUCCESS' && response.data) {
        const userData = response.data as User;
        setUser(userData);
        localStorage.setItem('voting_user', JSON.stringify(userData));
      } else {
        localStorage.removeItem('voting_user');
        localStorage.removeItem('voting_token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('voting_user');
      localStorage.removeItem('voting_token');
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('voting_user');
      const storedToken = localStorage.getItem('voting_token');
      
      if (storedUser && storedToken) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          await refreshUser();
        } catch {
          localStorage.removeItem('voting_user');
          localStorage.removeItem('voting_token');
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    initAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string; needsVerification?: boolean }> => {
    setIsLoading(true);
    
    try {
      const response = await authAPI.login(email, password);
      
      if (response.code === 'SUCCESS' && response.data) {
        setUser(response.data.user as User);
        localStorage.setItem('voting_user', JSON.stringify(response.data.user));
        localStorage.setItem('voting_token', response.data.token);
        setIsLoading(false);
        return { success: true, message: 'Login successful!' };
      }
      
      if (response.code === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(email);
        setIsLoading(false);
        return { success: false, message: response.msg, needsVerification: true };
      }
      
      setIsLoading(false);
      return { success: false, message: response.msg || 'Login failed' };
    } catch {
      setIsLoading(false);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    
    try {
      const response = await authAPI.signup(name, email, password);
      
      if (response.code === 'SUCCESS') {
        setPendingEmail(email);
        setIsLoading(false);
        return { success: true, message: response.msg };
      }
      
      setIsLoading(false);
      return { success: false, message: response.msg || 'Signup failed' };
    } catch {
      setIsLoading(false);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await authAPI.verifyEmail(email, code);
      
      if (response.code === 'SUCCESS') {
        setPendingEmail(null);
        return { success: true, message: response.msg };
      }
      
      return { success: false, message: response.msg || 'Verification failed' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const resendCode = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await authAPI.resendCode(email);
      return { success: response.code === 'SUCCESS', message: response.msg };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const googleLogin = async (credential: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    
    try {
      const response = await authAPI.googleAuth(credential);
      
      if (response.code === 'SUCCESS' && response.data) {
        setUser(response.data.user as User);
        localStorage.setItem('voting_user', JSON.stringify(response.data.user));
        localStorage.setItem('voting_token', response.data.token);
        setIsLoading(false);
        return { success: true, message: 'Login successful!' };
      }
      
      setIsLoading(false);
      return { success: false, message: response.msg || 'Google login failed' };
    } catch {
      setIsLoading(false);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setPendingEmail(null);
    localStorage.removeItem('voting_user');
    localStorage.removeItem('voting_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        pendingEmail,
        login,
        signup,
        logout,
        verifyEmail,
        resendCode,
        googleLogin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
