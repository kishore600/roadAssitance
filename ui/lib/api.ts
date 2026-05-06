import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  console.log('API Base URL:', url);
  if (!url) {
    throw new Error('❌ EXPO_PUBLIC_API_URL is not set');
  }

  return `${url}/api`;
};

const API_BASE_URL = getBaseUrl();

class API {
  private baseUrl: string;
  private token: string | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.initializationPromise = this.initialize();
  }

  private async initialize() {
    await this.loadToken();
    console.log('API initialized, token exists:', !!this.token);
  }

  async loadToken() {
    try {
      // Try to get token from SecureStore
      this.token = await SecureStore.getItemAsync('auth_token');
      
      // Also check for legacy token key
      if (!this.token) {
        const legacyToken = await SecureStore.getItemAsync('token');
        if (legacyToken) {
          console.log('Migrating legacy token');
          this.token = legacyToken;
          await SecureStore.setItemAsync('auth_token', legacyToken);
          await SecureStore.deleteItemAsync('token');
        }
      }
      
      console.log('Token loaded:', !!this.token);
      if (this.token) {
        console.log('Token preview:', this.token.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('Failed to load token:', error);
      this.token = null;
    }
  }

  async setUser(user: any) {
    if (user && user.id) {
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      // Also notify socket service
      const { socketService } = await import('./socket');
      socketService.setUser(user.id);
    }
  }

  async clearUser() {
    await SecureStore.deleteItemAsync('user');
    const { socketService } = await import('./socket');
    socketService.clearUser();
  }
  
  async setToken(token: string) {
    this.token = token;
    await SecureStore.setItemAsync('auth_token', token);
    console.log('Token saved successfully, length:', token.length);
    
    // Verify token was saved
    const verifyToken = await SecureStore.getItemAsync('auth_token');
    console.log('Token verification - saved successfully:', !!verifyToken);
  }

  async clearToken() {
    this.token = null;
    await SecureStore.deleteItemAsync('auth_token');
    console.log('Token cleared');
  }

  // Helper method to ensure token is loaded before each request
  private async ensureToken() {
    // Wait for initialization to complete
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    
    // Always reload token to ensure it's fresh
    await this.loadToken();
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    // Ensure token is loaded before making request
    await this.ensureToken();
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📤 Making ${options.method || 'GET'} request to:`, url);
    
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    // Always add token to Authorization header if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      console.log('✅ Authorization header added with token');
    } else {
      console.log('⚠️ No token available for request - user might not be logged in');
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Important for cookies
      mode: 'cors', // Enable CORS
    };

    try {
      const response = await fetch(url, fetchOptions);
      console.log(`📥 Response status:`, response.status);
      
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { message: text || 'Empty response' };
      }
      
      if (!response.ok) {
        console.log(`❌ Request failed with status ${response.status}`);
        if (response.status === 401) {
          console.log('🔐 Unauthorized - Clearing token');
          await this.clearToken();
        }
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
      }
      
      console.log(`✅ Request successful: ${response.status}`);
      return { data, response };
    } catch (error) {
      console.error(`❌ Request failed for ${url}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  async get(endpoint: string, options?: { params?: Record<string, any>; headers?: any }) {
    let url = endpoint;
    if (options?.params) {
      const params = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request(url, { 
      method: 'GET',
      headers: options?.headers 
    });
  }

  async post(endpoint: string, body: any, options?: { headers?: any }) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: options?.headers,
    });
  }

  async patch(endpoint: string, body: any, options?: { headers?: any }) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: options?.headers,
    });
  }

  async put(endpoint: string, body: any, options?: { headers?: any }) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: options?.headers,
    });
  }

  async delete(endpoint: string, options?: { headers?: any; body?: any }) {
    const requestOptions: RequestInit = { 
      method: 'DELETE',
      headers: options?.headers,
    };
    
    if (options?.body) {
      requestOptions.body = JSON.stringify(options.body);
    }
    
    return this.request(endpoint, requestOptions);
  }

  // Upload file method with FormData
  async upload(endpoint: string, formData: FormData, onProgress?: (progress: number) => void) {
    await this.ensureToken();
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📤 Uploading to:`, url);
    
    const headers: any = {
      'Accept': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      console.log('✅ Authorization header added for upload');
    } else {
      console.log('⚠️ No token available for upload');
    }

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
      mode: 'cors',
    };

    try {
      const response = await fetch(url, fetchOptions);
      console.log(`📥 Upload response status:`, response.status);
      
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { message: text || 'Empty response' };
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          await this.clearToken();
        }
        throw new Error(data.error || data.message || `Upload failed with status ${response.status}`);
      }
      
      console.log(`✅ Upload successful: ${response.status}`);
      return { data, response };
    } catch (error) {
      console.error(`❌ Upload failed for ${url}:`, error);
      throw error;
    }
  }

  // Method to check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    await this.ensureToken();
    return !!this.token;
  }

  // Method to refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const { data } = await this.post('/auth/refresh-token', {});
      if (data.token) {
        await this.setToken(data.token);
        console.log('Token refreshed successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }

  // Debug method to check token status
  async checkTokenStatus(): Promise<{ exists: boolean; preview?: string }> {
    const token = await SecureStore.getItemAsync('auth_token');
    return {
      exists: !!token,
      preview: token ? token.substring(0, 20) + '...' : undefined
    };
  }
}

export const api = new API(API_BASE_URL);