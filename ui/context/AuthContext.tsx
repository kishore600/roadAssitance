import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'customer' | 'mechanic';
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  fullName: string;
  role: 'customer' | 'mechanic';
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      // Check for stored token and user data
      const token = await SecureStore.getItemAsync('auth_token');
      const userData = await SecureStore.getItemAsync('user_data');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Set token in API client for subsequent requests
        await api.setToken(token);
        
        console.log('Session restored from cookies');
      }
    } catch (error) {
      console.error('Session check failed:', error);
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  }

  async function clearSession() {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
    await api.clearToken();
    setUser(null);
  }

  async function login(email: string, password: string): Promise<boolean> {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      if (data.success || data.token) {
        // Store token and user data securely (like cookies)
        await SecureStore.setItemAsync('auth_token', data.token);
        await SecureStore.setItemAsync('user_data', JSON.stringify(data.user));
        
        // Set token in API client for subsequent requests
        await api.setToken(data.token);
        setUser(data.user);
        
        // Navigate based on role
        if (data.user.role === 'mechanic') {
          router.replace('/mechanic/dashboard');
        } else {
          router.replace('/(tabs)/customer');
        }
        
        Alert.alert('Success', 'Logged in successfully!');
        return true;
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
      return false;
    }
  }

  async function signup(data: SignupData): Promise<boolean> {
    try {
      const { data: response } = await api.post('/auth/signup', data);
      
      if (response.success || response.token) {
        // Store token and user data securely (like cookies)
        await SecureStore.setItemAsync('auth_token', response.token);
        await SecureStore.setItemAsync('user_data', JSON.stringify(response.user));
        
        // Set token in API client for subsequent requests
        await api.setToken(response.token);
        setUser(response.user);
        
        // Navigate based on role
        if (response.user.role === 'mechanic') {
          router.replace('/mechanic/dashboard');
        } else {
          router.replace('/(tabs)/customer');
        }
        
        Alert.alert('Success', 'Account created successfully!');
        return true;
      } else {
        throw new Error('Signup failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      Alert.alert('Signup Failed', error.message || 'Could not create account');
      return false;
    }
  }

  async function logout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            router.replace('/');
            Alert.alert('Logged Out', 'You have been logged out successfully.');
          }
        }
      ]
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, checkSession }}>
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