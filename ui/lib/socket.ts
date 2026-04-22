// lib/socket.ts - Updated with user room joining and better event handling
import io, { Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const SOCKET_URL = Platform.OS === 'android' 
  ? `${process.env.EXPO_PUBLIC_API_URL}` // Android emulator
  : `http://localhost:3000`; // iOS or web

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.initSocket();
  }

  private initSocket() {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.joinUserRoom();
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      this.joinUserRoom();
    });

    // Handle all booking events
    this.socket.on('booking:accepted', (data) => {
      console.log('📱 Booking accepted event:', data);
      this.emitEvent('booking:accepted', data);
    });

    this.socket.on('booking:status:updated', (data) => {
      console.log('📱 Booking status updated:', data);
      this.emitEvent('booking:status:updated', data);
    });

    this.socket.on('mechanic:location:update', (data) => {
      console.log('📱 Mechanic location update:', data);
      this.emitEvent('mechanic:location:update', data);
    });

    this.socket.on('service:completed', (data) => {
      console.log('✅ Service completed event:', data);
      this.emitEvent('service:completed', data);
    });

    this.socket.on('booking:new', (data) => {
      console.log('📱 New booking event:', data);
      this.emitEvent('booking:new', data);
    });

    this.socket.on('request:mechanic:location', (data) => {
      console.log('📱 Request mechanic location:', data);
      this.emitEvent('request:mechanic:location', data);
    });

     this.socket.on('otp:verified', (data) => {
    console.log('🔐 OTP verified event:', data);
    this.emitEvent('otp:verified', data);
  });
  }
  
    public emitOtpVerified(bookingId: string) {
    if (this.socket && bookingId) {
      this.socket.emit('otp:verified', { bookingId });
      console.log(`📤 Emitted otp:verified for booking: ${bookingId}`);
    }
  }

  private async joinUserRoom() {
    try {
      // Get user from secure storage
      const userStr = await SecureStore.getItemAsync('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.id && this.socket) {  
          this.userId = user.id;
          this.socket.emit('user:join', user.id);
          console.log(`User ${user.id} joined their personal room`);
        }
      }
    } catch (error) {
      console.error('Failed to join user room:', error);
    }
  }

  // Set user ID manually (call after login)
  public async setUser(userId: string) {
    this.userId = userId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('user:join', userId);
      console.log(`User ${userId} joined personal room`);
    }
  }

  // Clear user (call on logout)
  public clearUser() {
    this.userId = null;
  }

  // Join a booking room
  public joinBookingRoom(bookingId: string) {
    if (this.socket && bookingId) {
      this.socket.emit('join:booking', bookingId);
      console.log(`Joined booking room: ${bookingId}`);
    }
  }

  // Leave a booking room
  public leaveBookingRoom(bookingId: string) {
    if (this.socket && bookingId) {
      this.socket.emit('leave:booking', bookingId);
      console.log(`Left booking room: ${bookingId}`);
    }
  }

  // Join mechanic room for tracking
  public joinMechanicRoom(mechanicId: string) {
    if (this.socket && mechanicId) {
      this.socket.emit('join:mechanic', mechanicId);
      console.log(`Joined mechanic room: ${mechanicId}`);
    }
  }

  // Send mechanic location update
  public sendMechanicLocation(bookingId: string, location: { lat: number; lng: number }, eta: number, mechanicId?: string) {
    if (this.socket && bookingId && location) {
      const locationData = {
        bookingId,
        location: {
          lat: location.lat,
          lng: location.lng
        },
        eta,
        mechanicId: mechanicId || this.userId,
        timestamp: new Date().toISOString()
      };
      this.socket.emit('mechanic:location:update', locationData);
      console.log('Sent mechanic location update:', locationData);
    }
  }

  // Request mechanic location (customer)
  public requestMechanicLocation(bookingId: string) {
    if (this.socket && bookingId) {
      this.socket.emit('customer:request:mechanic:location', { bookingId });
      console.log(`Requested mechanic location for booking: ${bookingId}`);
    }
  }

  // Accept booking (mechanic)
  public acceptBooking(bookingId: string, mechanic: any, eta: number = 15) {
    if (this.socket && bookingId) {
      this.socket.emit('booking:accept', {
        bookingId,
        mechanic,
        eta
      });
      console.log(`Accepted booking: ${bookingId}`);
    }
  }

  // Update booking status
  public updateBookingStatus(bookingId: string, status: string, mechanicLocation?: any) {
    if (this.socket && bookingId) {
      this.socket.emit('booking:status:update', {
        bookingId,
        status,
        timestamp: new Date().toISOString(),
        mechanicLocation
      });
      console.log(`Updated booking ${bookingId} status to: ${status}`);
    }
  }

  // Complete booking with OTP
  public completeBooking(bookingId: string, customerId?: string, mechanicId?: string, mechanicName?: string, customerName?: string) {
    if (this.socket && bookingId) {
      this.socket.emit('booking:complete', {
        bookingId,
        completedAt: new Date().toISOString(),
        customerId,
        mechanicId,
        mechanicName,
        customerName
      });
      console.log(`Completed booking: ${bookingId}`);
    }
  }

  // Emit new booking (backend)
  public emitNewBooking(bookingData: any) {
    if (this.socket) {
      this.socket.emit('booking:new', bookingData);
      console.log('Emitted new booking:', bookingData.id);
    }
  }

  // Event listener management
  public on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  public off(event: string, callback?: Function) {
    if (callback) {
      this.eventListeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback as any);
      }
    } else {
      this.eventListeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  private emitEvent(event: string, data: any) {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Check connection status
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Disconnect socket
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Reconnect socket
  public reconnect() {
    if (!this.socket || !this.socket.connected) {
      this.initSocket();
    }
  }

  // Get socket instance (for debugging)
  public getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
export const socketService = new SocketService();

// Export socket for backward compatibility
export const socket = socketService;

// Helper hook for components
export function useSocket() {
  return socketService;
}