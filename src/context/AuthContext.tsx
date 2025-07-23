import React, { createContext, useContext, useEffect, useState } from 'react';
import { Doctor, AuthService } from '@/data/authData';

interface AuthContextType {
  currentDoctor: Doctor | null;
  login: (email: string, password: string) => Doctor | null;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const doctor = AuthService.getCurrentDoctor();
    setCurrentDoctor(doctor);
  }, []);

  const login = (email: string, password: string): Doctor | null => {
    const doctor = AuthService.login({ email, password });
    setCurrentDoctor(doctor);
    return doctor;
  };

  const logout = () => {
    AuthService.logout();
    setCurrentDoctor(null);
  };

  const isAuthenticated = currentDoctor !== null;

  return (
    <AuthContext.Provider value={{ currentDoctor, login, logout, isAuthenticated }}>
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