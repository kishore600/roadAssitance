// server/socket.js - Fixed version with OTP verification
import { Server } from 'socket.io';

let io:any;

export function initSocket(server:any) {
  io = server;
  
  io.on('connection', (socket:any) => {
    console.log('User connected:', socket.id);

    // Join user to their personal room for direct notifications
    socket.on('user:join', (userId:any) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`User ${userId} joined their personal room`);
      }
    });

    // Join booking room
    socket.on('join:booking', (bookingId:any) => {
      if (bookingId) {
        socket.join(`booking:${bookingId}`);
        console.log(`Socket ${socket.id} joined booking:${bookingId}`);
      }
    });

    // Join mechanic room for location updates
    socket.on('join:mechanic', (mechanicId:any) => {
      if (mechanicId) {
        socket.join(`mechanic:${mechanicId}`);
        console.log(`Socket ${socket.id} joined mechanic:${mechanicId}`);
      }
    });

    // Handle mechanic accepting booking
    socket.on('booking:accept', (data:any) => {
      const { bookingId, mechanic, eta } = data;
      console.log(`Booking accepted: ${bookingId} by mechanic ${mechanic?.id}`);
      
      if (bookingId) {
        // Emit to customer who requested this booking
        io.to(`booking:${bookingId}`).emit('booking:accepted', {
          booking: { 
            id: bookingId, 
            status: 'accepted', 
            eta_minutes: eta || 15,
            mechanic: mechanic
          },
          mechanic: mechanic
        });
        
        // Also emit general update
        io.to(`booking:${bookingId}`).emit('booking:updated', {
          id: bookingId,
          status: 'accepted',
          mechanic_id: mechanic?.id,
          eta_minutes: eta || 15
        });
      }
    });

    // Handle status updates
    socket.on('booking:status:update', (data:any) => {
      const { bookingId, status, timestamp, mechanicLocation } = data;
      console.log(`Booking status update: ${bookingId} -> ${status}`);
      
      if (bookingId) {
        io.to(`booking:${bookingId}`).emit('booking:status:updated', {
          id: bookingId,
          status: status,
          updated_at: timestamp || new Date().toISOString(),
          ...(mechanicLocation && { mechanic_location: mechanicLocation })
        });
        
        // If status is completed, emit specific completion event
        if (status === 'completed') {
          io.to(`booking:${bookingId}`).emit('service:completed', { 
            bookingId: bookingId,
            completedAt: timestamp || new Date().toISOString()
          });
        }
      }
    });

    // Handle real-time location updates from mechanic
    socket.on('mechanic:location:update', (data:any) => {
      const { bookingId, location, eta, mechanicId } = data;
      
      console.log(`Received mechanic location update - Booking: ${bookingId}, Location:`, location);
      
      if (bookingId && location) {
        // Ensure location has the correct format
        const locationData = {
          bookingId: bookingId,
          location: {
            lat: location.lat || location.latitude,
            lng: location.lng || location.longitude
          },
          eta: eta || 0,
          timestamp: new Date().toISOString(),
          mechanicId: mechanicId
        };
        
        // Emit to the specific booking room
        io.to(`booking:${bookingId}`).emit('mechanic:location:update', locationData);
        console.log(`Emitted location update to booking:${bookingId}`);
      }
    });

    // Alternative event name that mechanics might be using
    socket.on('mechanic:location', (data:any) => {
      console.log('Received mechanic:location event:', data);
      
      const { bookingId, location, eta, mechanicId } = data;
      
      if (bookingId && location) {
        const locationData = {
          bookingId: bookingId,
          location: {
            lat: location.lat || location.latitude,
            lng: location.lng || location.longitude
          },
          eta: eta || 0,
          timestamp: new Date().toISOString(),
          mechanicId: mechanicId
        };
        
        io.to(`booking:${bookingId}`).emit('mechanic:location:update', locationData);
      }
    });

    // Handle OTP verification from customer
    socket.on('otp:verified', (data:any) => {
      const { bookingId } = data;
      console.log(`🔐 OTP verified for booking: ${bookingId}`);
      
      if (bookingId) {
        // Forward to the booking room so mechanic gets notified
        io.to(`booking:${bookingId}`).emit('otp:verified', { bookingId });
        console.log(`Emitted otp:verified to booking:${bookingId}`);
      }
    });

    // Handle booking completion
    socket.on('booking:complete', (data:any) => {
      const { bookingId, completedAt, customerId, mechanicId, mechanicName, customerName } = data;
      console.log(`Booking completed: ${bookingId}`);
      
      if (bookingId) {
        // Emit to booking room
        io.to(`booking:${bookingId}`).emit('service:completed', {
          bookingId: bookingId,
          completedAt: completedAt || new Date().toISOString()
        });
        
        // Also emit to user rooms for direct notifications
        if (customerId) {
          io.to(`user:${customerId}`).emit('service:completed', {
            bookingId: bookingId,
            mechanicName: mechanicName || 'Mechanic',
            completedAt: completedAt || new Date().toISOString()
          });
        }
        
        if (mechanicId) {
          io.to(`user:${mechanicId}`).emit('service:completed', {
            bookingId: bookingId,
            customerName: customerName || 'Customer',
            completedAt: completedAt || new Date().toISOString()
          });
        }
        
        // Also emit general booking status update
        io.to(`booking:${bookingId}`).emit('booking:status:updated', {
          id: bookingId,
          status: 'completed',
          updated_at: completedAt || new Date().toISOString()
        });
      }
    });

    // Handle customer requesting mechanic location
    socket.on('customer:request:mechanic:location', (data:any) => {
      const { bookingId } = data;
      console.log(`Customer requested mechanic location for booking: ${bookingId}`);
      
      if (bookingId) {
        io.to(`booking:${bookingId}`).emit('request:mechanic:location', {
          bookingId: bookingId,
          requestedAt: new Date().toISOString()
        });
      }
    });

    // Handle new booking creation
    socket.on('booking:new', (bookingData:any) => {
      console.log(`New booking created: ${bookingData.id}`);
      // Broadcast to all mechanics (or specific room)
      io.emit('booking:new', bookingData);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
  
  return io;
}

// Helper functions to emit events from elsewhere in the app
export function emitBookingUpdate(bookingId:any, data:any) {
  if (io) {
    io.to(`booking:${bookingId}`).emit('booking:status:updated', data);
    
    // If booking is completed, emit specific completion event
    if (data.status === 'completed') {
      io.to(`booking:${bookingId}`).emit('service:completed', { 
        bookingId: bookingId,
        completedAt: new Date().toISOString()
      });
      
      if (data.customer_id) {
        io.to(`user:${data.customer_id}`).emit('service:completed', {
          bookingId: bookingId,
          mechanicName: data.mechanic?.full_name || 'Mechanic',
          completedAt: new Date().toISOString()
        });
      }
      
      if (data.mechanic_id) {
        io.to(`user:${data.mechanic_id}`).emit('service:completed', {
          bookingId: bookingId,
          customerName: data.customer?.full_name || 'Customer',
          completedAt: new Date().toISOString()
        });
      }
    }
  }
}

export function emitMechanicLocation(data:any) {
  if (io && data.profile_id) {
    io.to(`mechanic:${data.profile_id}`).emit('mechanic:location:updated', data);
  }
}

export function emitNewBooking(bookingData:any) {
  if (io) {
    io.emit('booking:new', bookingData);
  }
}

export function emitOtpVerified(bookingId: string) {
  if (io) {
    io.to(`booking:${bookingId}`).emit('otp:verified', { bookingId });
    console.log(`OTP verified event emitted for booking: ${bookingId}`);
  }
}

export function getIO() {
  return io;
}